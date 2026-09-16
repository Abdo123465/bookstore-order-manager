import { Order, OrderStatus, OrderWithDetails, BookItem, BookStatus } from '../types';
import { supabase } from './supabase.service';
import { getAllCustomers, addCustomer } from './customer.service.cloud';

export const calculateOrderStatus = (items: BookItem[]): OrderStatus => {
  if (!items || items.length === 0) return OrderStatus.Pending;

  const statuses = items.map(i => i.status || BookStatus.Pending);
  
  // If ALL items are cancelled, the whole order is cancelled
  const allCancelled = statuses.every(s => s === BookStatus.Cancelled);
  if (allCancelled) return OrderStatus.Cancelled;

  // If ALL items are either Delivered or Cancelled, the order is considered Delivered (finished)
  const allFinished = statuses.every(s => s === BookStatus.Delivered || s === BookStatus.Cancelled);
  if (allFinished) return OrderStatus.Delivered;

  // Otherwise, if there is at least one Pending item, the order is Pending
  return OrderStatus.Pending;
};

export const getAllOrders = async (): Promise<Order[]> => {
  const { data, error } = await supabase
    .from('orders')
    .select('*');
  
  if (error) throw error;
  
  return (data || []).map(r => ({
    ...r,
    customerId: r.customer_id,
    publisherId: r.publisher_id,
    academicYearId: r.year_id,
    paymentMethodId: r.payment_method_id,
    receivedDate: r.received_date,
    expectedDeliveryDate: r.expected_delivery_date,
    createdAt: r.created_at,
    employeeName: r.employee_name,
    bookType: r.book_type,
    items: r.items || []
  }));
};

export const addOrder = async (
  customerId: number, 
  deposit: number, 
  publisherId: string,
  academicYearId: string,
  subject: string,
  quantity: number,
  paymentMethodId: string,
  receivedDate: string,
  expectedDeliveryDate: string,
  employeeName?: string,
  bookType?: string,
  notes?: string,
  items?: BookItem[],
  excess_deposit: number = 0,
  invoiceNumber?: string
): Promise<Order> => {
  const createdAt = new Date().toISOString();
  
  // Ensure items have a default status if missing
  const itemsWithStatus = (items || []).map(item => ({
    ...item,
    status: item.status || BookStatus.Pending
  }));
  
  const status = calculateOrderStatus(itemsWithStatus);

  const { data, error } = await supabase
    .from('orders')
    .insert({
      customer_id: customerId,
      publisher_id: publisherId,
      year_id: academicYearId,
      subject,
      quantity,
      deposit,
      payment_method_id: paymentMethodId,
      status,
      received_date: receivedDate,
      expected_delivery_date: expectedDeliveryDate,
      created_at: createdAt,
      employee_name: employeeName,
      book_type: bookType,
      notes,
      items: itemsWithStatus,
      excess_deposit,
      invoice_number: invoiceNumber
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    customerId,
    publisherId,
    academicYearId,
    subject,
    quantity,
    deposit,
    paymentMethodId,
    status,
    receivedDate,
    expectedDeliveryDate,
    createdAt,
    employeeName,
    bookType,
    notes,
    items: itemsWithStatus,
    excess_deposit,
    invoiceNumber
  };
};

export const createOrder = async (
  customerName: string, 
  customerPhone: string, 
  publisherId: string,
  academicYearId: string,
  subject: string,
  quantity: number,
  deposit: number, 
  paymentMethodId: string,
  receivedDate: string,
  expectedDeliveryDate: string,
  employeeName?: string,
  bookType?: string,
  notes?: string,
  items?: BookItem[],
  excess_deposit: number = 0,
  invoiceNumber?: string
): Promise<Order> => {
  const customers = await getAllCustomers();
  let customer = customers.find(c => c.phone === customerPhone);
  
  if (!customer) {
    customer = await addCustomer(customerName, customerPhone);
  }
  
  return await addOrder(
    customer.id, 
    deposit, 
    publisherId, 
    academicYearId, 
    subject, 
    quantity, 
    paymentMethodId, 
    receivedDate, 
    expectedDeliveryDate, 
    employeeName,
    bookType,
    notes,
    items,
    excess_deposit,
    invoiceNumber
  );
};

export const updateOrder = async (
  id: number,
  updates: Partial<Omit<Order, 'id' | 'createdAt'>>
): Promise<void> => {
  const { data: current, error: fetchError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();
  
  if (fetchError) throw fetchError;
  
  // If items are being updated, recalculate order status
  if (updates.items) {
    const itemsWithStatus = updates.items.map(item => ({
      ...item,
      status: item.status || BookStatus.Pending
    }));
    updates.items = itemsWithStatus;
    updates.status = calculateOrderStatus(itemsWithStatus);
  }

  // Check for duplicates
  if (updates.customerId || updates.subject || updates.publisherId || updates.academicYearId) {
    const customerId = updates.customerId || current.customer_id;
    const subject = updates.subject || current.subject;
    const publisherId = updates.publisherId || current.publisher_id;
    const academicYearId = updates.academicYearId || current.year_id;
    const bookType = updates.bookType || current.book_type;

    const { data: duplicate } = await supabase
      .from('orders')
      .select('id')
      .neq('id', id)
      .eq('customer_id', customerId)
      .eq('subject', subject)
      .eq('publisher_id', publisherId)
      .eq('year_id', academicYearId)
      .eq('book_type', bookType)
      .neq('status', OrderStatus.Delivered)
      .single();

    if (duplicate) {
      throw new Error('يوجد حجز مماثل لهذا العميل بالفعل (نفس المادة، الناشر، والنوع).');
    }
  }

  // Map keys to DB column names
  const dbUpdates: any = {};
  const columnMap: Record<string, string> = {
    customerId: 'customer_id',
    publisherId: 'publisher_id',
    academicYearId: 'year_id',
    receivedDate: 'received_date',
    expectedDeliveryDate: 'expected_delivery_date',
    employeeName: 'employee_name',
    bookType: 'book_type',
    paymentMethodId: 'payment_method_id',
    excess_deposit: 'excess_deposit',
    invoiceNumber: 'invoice_number'
  };

  Object.keys(updates).forEach(key => {
    const dbKey = columnMap[key] || key;
    dbUpdates[dbKey] = (updates as any)[key];
  });

  const { error } = await supabase
    .from('orders')
    .update(dbUpdates)
    .eq('id', id);

  if (error) throw error;
};

export const updateOrderStatus = async (orderId: number, status: OrderStatus): Promise<void> => {
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId);
  
  if (error) throw error;
};

export const deleteOrder = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

export const getOrdersWithCustomerDetails = async (): Promise<OrderWithDetails[]> => {
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(`
      *,
      customers!inner(name, phone),
      publishers(name),
      academic_years(name),
      payment_methods(name)
    `)
    .order('created_at', { ascending: false });
  
  if (ordersError) throw ordersError;

  // Fetch reference data
  const { data: subjects } = await supabase.from('subjects').select('*');
  const { data: publishers } = await supabase.from('publishers').select('*');
  const { data: years } = await supabase.from('academic_years').select('*');

  return (orders || []).map(row => {
    const items = row.items || [];
    const resolvedItems = items.map((item: BookItem) => {
      const itemPublisher = publishers?.find(p => p.id === item.publisherId);
      const itemSubject = subjects?.find(s => s.id === item.subjectId);
      const itemYear = years?.find(y => y.id === (item.academicYearId || row.year_id));
      
      return {
        ...item,
        publisherName: itemPublisher?.name || 'غير محدد',
        grade: itemYear?.name || 'غير محدد',
        bookName: itemSubject?.name || 'غير محدد'
      };
    });

    return {
      id: row.id,
      customerId: row.customer_id,
      publisherId: row.publisher_id,
      academicYearId: row.year_id,
      subject: row.subject,
      quantity: row.quantity,
      deposit: row.deposit,
      paymentMethodId: row.payment_method_id,
      status: row.status,
      receivedDate: row.received_date,
      expectedDeliveryDate: row.expected_delivery_date,
      createdAt: row.created_at,
      employeeName: row.employee_name,
      bookType: row.book_type,
      notes: row.notes,
      excess_deposit: row.excess_deposit,
      invoiceNumber: row.invoice_number,
      customerName: row.customers?.name || '',
      customerPhone: row.customers?.phone || '',
      publisherName: row.publishers?.name,
      academicYearName: row.academic_years?.name,
      paymentMethodName: row.payment_methods?.name,
      items: resolvedItems
    };
  });
};
