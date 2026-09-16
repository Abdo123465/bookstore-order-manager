export enum OrderStatus {
  Pending = "Pending",     // قيد الانتظار
  Delivered = "Delivered", // تم التسليم
  Cancelled = "Cancelled", // تم الإلغاء
}

export enum BookStatus {
  Pending = "Pending",     // قيد الانتظار
  Delivered = "Delivered", // تم التسليم
  Cancelled = "Cancelled", // تم الإلغاء
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
}

// عنصر كتاب واحد
export interface BookItem {
  id?: string;
  publisherId: string;   // دار النشر *
  type: string;          // النوع *
  subjectId: string;     // المادة (اسم الكتاب) *
  academicYearId?: string; // الصف الدراسي (اختياري، يستخدم الصف الرئيسي للطلب إذا لم يحدد)
  quantity: number;      // الكمية
  deposit?: number;      // عربون الكتاب
  grade?: string;        // حقل للعرض فقط في التقارير
  bookName?: string;     // حقل للعرض فقط في التقارير
  publisherName?: string; // حقل للعرض فقط في التقارير
  status?: BookStatus;    // حالة الكتاب
}

export interface Order {
  id: number;
  customerId: number;
  publisherId: string;
  academicYearId: string;
  subject: string;
  quantity: number;
  deposit: number;
  paymentMethodId: string;
  status: OrderStatus;
  receivedDate: string;
  expectedDeliveryDate: string;
  createdAt: string;
  employeeName?: string;
  bookType?: string;
  notes?: string;
  items?: BookItem[];    // قائمة الكتب المطلوبة
  excess_deposit?: number; // العربون الإضافي
  invoiceNumber?: string; // رقم الفاتورة
}

export interface OrderWithDetails extends Order {
  customerName: string;
  customerPhone: string;
  publisherName?: string;
  academicYearName?: string;
  paymentMethodName?: string;
  notes?: string;
  items?: BookItem[];
}

export interface Publisher {
  id: string;
  name: string;
}

export interface AcademicYear {
  id: string;
  name: string;
}

export interface Subject {
  id: string;
  name: string;
}

export interface Employee {
  id: string;
  name: string;
  sortOrder: number;
}

export interface BookType {
  id: string;
  name: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: "cash" | "instapay" | "card";
}

export interface AppSettings {
  deliveryIntervalDays: number;
  minQuantity: number;
  maxQuantity: number;
  depositPerBook: number;
  employeeCapacity: number;
}

export interface SQLLog {
  id: string;
  timestamp: string;
  query: string;
}
