import { Order, OrderStatus, OrderWithDetails, BookItem, BookStatus } from '../types';
import { USE_CLOUD } from './config';
import { supabase } from './supabase.service';
import { logSQL } from './storage';
import { getAllCustomers, addCustomer } from './customer.service';
import { loadReferenceData } from './reference-cache';

export const calculateOrderStatus = (items: BookItem[]): OrderStatus => {
  if (!items || items.length === 0) return OrderStatus.Pending;

  const statuses = items.map(i => i.status || BookStatus.Pending);
  
  const allCancelled = statuses.every(s => s === BookStatus.Cancelled);
  if (allCancelled) return OrderStatus.Cancelled;

  const allFinished = statuses.every(s => s === BookStatus.Delivered || s === BookStatus.Cancelled);
  if (allFinished) return OrderStatus.Delivered;

  return OrderStatus.Pending;
};

// ============================================
// CLOUD (SUPABASE) IMPLEMENTATIONS
// ============================================

const cloudGetAllOrders = async (): Promise<Order[]> => {
  const { data, error } = await supabase.from('orders').select('*');
  if (error) throw new Error(error.message);
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
    items: Array.isArray(r.items) ? r.items : []
  }));
};

const cloudAddOrder = async (
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
      employee_name: employeeName,
      book_type: bookType,
      notes,
      items: itemsWithStatus,
      excess_deposit,
      invoice_number: invoiceNumber
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  
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
    createdAt: data.created_at,
    employeeName,
    bookType,
    notes,
    items: itemsWithStatus,
    excess_deposit,
    invoiceNumber
  };
};

const cloudCreateOrder = async (
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
  
  return await cloudAddOrder(
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

const cloudUpdateOrder = async (
  id: number,
  updates: Partial<Omit<Order, 'id' | 'createdAt'>>
): Promise<void> => {
  if (updates.items) {
    const itemsWithStatus = updates.items.map(item => ({
      ...item,
      status: item.status || BookStatus.Pending
    }));
    updates.items = itemsWithStatus;
    updates.status = calculateOrderStatus(itemsWithStatus);
  }

  const dbUpdates: any = {};
  
  if (updates.customerId !== undefined) dbUpdates.customer_id = updates.customerId;
  if (updates.publisherId !== undefined) dbUpdates.publisher_id = updates.publisherId;
  if (updates.academicYearId !== undefined) dbUpdates.year_id = updates.academicYearId;
  if (updates.subject !== undefined) dbUpdates.subject = updates.subject;
  if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
  if (updates.deposit !== undefined) dbUpdates.deposit = updates.deposit;
  if (updates.paymentMethodId !== undefined) dbUpdates.payment_method_id = updates.paymentMethodId;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.receivedDate !== undefined) dbUpdates.received_date = updates.receivedDate;
  if (updates.expectedDeliveryDate !== undefined) dbUpdates.expected_delivery_date = updates.expectedDeliveryDate;
  if (updates.employeeName !== undefined) dbUpdates.employee_name = updates.employeeName;
  if (updates.bookType !== undefined) dbUpdates.book_type = updates.bookType;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
  if (updates.items !== undefined) dbUpdates.items = updates.items;
  if (updates.excess_deposit !== undefined) dbUpdates.excess_deposit = updates.excess_deposit;
  if (updates.invoiceNumber !== undefined) dbUpdates.invoice_number = updates.invoiceNumber;

  const { error } = await supabase
    .from('orders')
    .update(dbUpdates)
    .eq('id', id);

  if (error) throw new Error(error.message);
};

const cloudUpdateOrderStatus = async (orderId: number, status: OrderStatus): Promise<void> => {
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId);

  if (error) throw new Error(error.message);
};

const cloudDeleteOrder = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
};

const cloudGetOrdersWithCustomerDetails = async (): Promise<OrderWithDetails[]> => {
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (ordersError) throw new Error(ordersError.message);

  const { data: customers } = await supabase.from('customers').select('*');
  const refData = await loadReferenceData();

  return (orders || []).map(row => {
    const customer = (customers || []).find(c => c.id === row.customer_id);
    const publisher = refData.publishers.find(p => p.id === row.publisher_id);
    const year = refData.academicYears.find(y => y.id === row.year_id);
    const paymentMethod = refData.paymentMethods.find(pm => pm.id === row.payment_method_id);

    const rawItems = Array.isArray(row.items) ? row.items : [];
    const items = rawItems.map((item: BookItem) => {
      const itemPublisher = refData.publishers.find(p => p.id === item.publisherId);
      const itemSubject = refData.subjects.find(s => s.id === item.subjectId);
      const itemYear = refData.academicYears.find(y => y.id === (item.academicYearId || row.year_id));
      
      return {
        ...item,
        publisherName: itemPublisher?.name || 'غير محدد',
        grade: itemYear?.name || 'غير محدد',
        bookName: itemSubject?.name || 'غير محدد'
      };
    });

    return {
      ...row,
      customerId: row.customer_id,
      publisherId: row.publisher_id,
      academicYearId: row.year_id,
      paymentMethodId: row.payment_method_id,
      receivedDate: row.received_date,
      expectedDeliveryDate: row.expected_delivery_date,
      createdAt: row.created_at,
      employeeName: row.employee_name,
      bookType: row.book_type,
      invoiceNumber: row.invoice_number,
      customerName: customer?.name || 'غير محدد',
      customerPhone: customer?.phone || '',
      publisherName: publisher?.name || 'غير محدد',
      academicYearName: year?.name || 'غير محدد',
      paymentMethodName: paymentMethod?.name || 'غير محدد',
      items
    };
  });
};

// ============================================
// LOCAL (SQLITE) IMPLEMENTATIONS
// ============================================

const localGetAllOrders = async (): Promise<Order[]> => {
  await logSQL(`SELECT * FROM orders;`);
  const rows = await window.electron.db.query('SELECT * FROM orders');
  return rows.map(r => ({ ...r, items: JSON.parse(r.items || '[]') }));
};

const localAddOrder = async (
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
  
  const itemsWithStatus = (items || []).map(item => ({
    ...item,
    status: item.status || BookStatus.Pending
  }));
  
  const status = calculateOrderStatus(itemsWithStatus);
  const itemsJson = JSON.stringify(itemsWithStatus);

  await logSQL(`INSERT INTO orders (customer_id, publisher_id, ...) VALUES (${customerId}, '${publisherId}', ...);`);

  const result = await window.electron.db.execute(
    `INSERT INTO orders (
      customer_id, publisher_id, year_id, subject, quantity, deposit, 
      payment_method_id, status, received_date, expected_delivery_date, 
      created_at, employee_name, book_type, notes, items, excess_deposit, invoice_number
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      customerId, publisherId, academicYearId, subject, quantity, deposit,
      paymentMethodId, status, receivedDate, expectedDeliveryDate,
      createdAt, employeeName, bookType, notes, itemsJson, excess_deposit, invoiceNumber
    ]
  );

  return {
    id: result.lastInsertRowid,
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

const localCreateOrder = async (
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
  
  return await localAddOrder(
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

const localUpdateOrder = async (
  id: number,
  updates: Partial<Omit<Order, 'id' | 'createdAt'>>
): Promise<void> => {
  const current = await window.electron.db.getOne('SELECT * FROM orders WHERE id = ?', [id]);
  
  if (updates.items) {
    const itemsWithStatus = updates.items.map(item => ({
      ...item,
      status: item.status || BookStatus.Pending
    }));
    updates.items = itemsWithStatus;
    updates.status = calculateOrderStatus(itemsWithStatus);
  }

  if (updates.customerId || updates.subject || updates.publisherId || updates.academicYearId) {
    const customerId = updates.customerId || current.customer_id;
    const subject = updates.subject || current.subject;
    const publisherId = updates.publisherId || current.publisher_id;
    const academicYearId = updates.academicYearId || current.year_id;
    const bookType = updates.bookType || current.book_type;

    const duplicate = await window.electron.db.getOne(
      `SELECT id FROM orders 
       WHERE id != ? AND customer_id = ? AND subject = ? AND publisher_id = ? 
       AND year_id = ? AND book_type = ? AND status != ?`,
      [id, customerId, subject, publisherId, academicYearId, bookType, OrderStatus.Delivered]
    );

    if (duplicate) {
      throw new Error('يوجد حجز مماثل لهذا العميل بالفعل (نفس المادة، الناشر، والنوع).');
    }
  }

  const keys = Object.keys(updates);
  if (keys.length === 0) return;

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

  const setClause = keys.map(k => `${columnMap[k] || k} = ?`).join(', ');
  const values = keys.map(k => {
    const val = (updates as any)[k];
    return k === 'items' ? JSON.stringify(val) : val;
  });

  await logSQL(`UPDATE orders SET ... WHERE id = ${id};`);
  await window.electron.db.execute(`UPDATE orders SET ${setClause} WHERE id = ?`, [...values, id]);
};

const localUpdateOrderStatus = async (orderId: number, status: OrderStatus): Promise<void> => {
  await logSQL(`UPDATE orders SET status = '${status}' WHERE id = ${orderId};`);
  await window.electron.db.execute('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
};

const localDeleteOrder = async (id: number): Promise<void> => {
  await logSQL(`DELETE FROM orders WHERE id = ${id};`);
  await window.electron.db.execute('DELETE FROM orders WHERE id = ?', [id]);
};

const localGetOrdersWithCustomerDetails = async (): Promise<OrderWithDetails[]> => {
  await logSQL(`SELECT orders.*, customers.name, ... FROM orders JOIN customers ...`);
  
  const sql = `
    SELECT 
      o.*, 
      c.name as customerName, 
      c.phone as customerPhone,
      p.name as publisherName,
      y.name as academicYearName,
      pm.name as paymentMethodName
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    LEFT JOIN publishers p ON o.publisher_id = p.id
    LEFT JOIN academic_years y ON o.year_id = y.id
    LEFT JOIN payment_methods pm ON o.payment_method_id = pm.id
    ORDER BY o.created_at DESC
  `;
  
  const rows = await window.electron.db.query(sql);
  const refData = await loadReferenceData();

  return rows.map(row => {
    const items = JSON.parse(row.items || '[]');
    const resolvedItems = items.map((item: BookItem) => {
      const itemPublisher = refData.publishers.find(p => p.id === item.publisherId);
      const itemSubject = refData.subjects.find(s => s.id === item.subjectId);
      const itemYear = refData.academicYears.find(y => y.id === (item.academicYearId || row.year_id));
      
      return {
        ...item,
        publisherName: itemPublisher?.name || 'غير محدد',
        grade: itemYear?.name || 'غير محدد',
        bookName: itemSubject?.name || 'غير محدد'
      };
    });

    return {
      ...row,
      customerId: row.customer_id,
      publisherId: row.publisher_id,
      academicYearId: row.year_id,
      paymentMethodId: row.payment_method_id,
      receivedDate: row.received_date,
      expectedDeliveryDate: row.expected_delivery_date,
      createdAt: row.created_at,
      employeeName: row.employee_name,
      bookType: row.book_type,
      invoiceNumber: row.invoice_number,
      items: resolvedItems
    };
  });
};

// ============================================
// EXPORTS - BASED ON USE_CLOUD CONFIG
// ============================================

export const getAllOrders = USE_CLOUD ? cloudGetAllOrders : localGetAllOrders;
export const addOrder = USE_CLOUD ? cloudAddOrder : localAddOrder;
export const createOrder = USE_CLOUD ? cloudCreateOrder : localCreateOrder;
export const updateOrder = USE_CLOUD ? cloudUpdateOrder : localUpdateOrder;
export const updateOrderStatus = USE_CLOUD ? cloudUpdateOrderStatus : localUpdateOrderStatus;
export const deleteOrder = USE_CLOUD ? cloudDeleteOrder : localDeleteOrder;
export const getOrdersWithCustomerDetails = USE_CLOUD ? cloudGetOrdersWithCustomerDetails : localGetOrdersWithCustomerDetails;
