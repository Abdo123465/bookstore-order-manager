import React from 'react';
import { User, Calendar, Filter, Edit2, FileText, Download, Printer, Trash2, Info } from 'lucide-react';
import { OrderStatus, OrderWithDetails } from '../types';

interface OrderTableProps {
  orders: OrderWithDetails[];
  totalOrdersCount: number;
  isAdmin?: boolean;
  onStatusChange: (orderId: number, newStatus: OrderStatus) => void;
  onEdit: (order: OrderWithDetails) => void;
  onProfessionalPDF: (order: OrderWithDetails) => void;
  onReceiptPDF: (order: OrderWithDetails) => void;
  onDirectPrint: (order: OrderWithDetails) => void;
  onDelete: (order: OrderWithDetails) => void;
}

const statusColors: Record<OrderStatus, string> = {
  [OrderStatus.Pending]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [OrderStatus.Delivered]: 'bg-green-100 text-green-800 border-green-200',
  [OrderStatus.Cancelled]: 'bg-red-100 text-red-800 border-red-200',
};

const statusTranslations: Record<OrderStatus, string> = {
  [OrderStatus.Pending]: 'قيد الانتظار',
  [OrderStatus.Delivered]: 'تم التسليم',
  [OrderStatus.Cancelled]: 'تم الإلغاء',
};

const OrderTable: React.FC<OrderTableProps> = ({
  orders,
  totalOrdersCount,
  isAdmin,
  onStatusChange,
  onEdit,
  onProfessionalPDF,
  onReceiptPDF,
  onDirectPrint,
  onDelete,
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-right text-sm">
        <thead className="bg-gray-50 text-gray-600 font-bold">
          <tr>
            <th className="px-4 py-4">رقم الطلب</th>
            <th className="px-4 py-4">العميل</th>
            <th className="px-4 py-4">المادة والناشر</th>
            <th className="px-4 py-4">الكمية والعربون</th>
            <th className="px-4 py-4">المواعيد</th>
            <th className="px-4 py-4">الحالة</th>
            <th className="px-4 py-4 text-center">إجراءات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {orders.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                <div className="flex flex-col items-center">
                  <Info className="h-10 w-10 mb-2 opacity-20" />
                  <span>
                    {totalOrdersCount === 0
                      ? 'لا توجد طلبات حالياً.'
                      : 'لا توجد نتائج مطابقة للبحث.'}
                  </span>
                </div>
              </td>
            </tr>
          ) : (
            orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-4 font-bold text-gray-900">#{order.id}</td>
                <td className="px-4 py-4">
                  <div className="flex items-start space-x-2 space-x-reverse">
                    <div className="bg-indigo-50 p-1.5 rounded-full">
                      <User className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{order.customerName}</div>
                      <div className="text-gray-500 text-xs">{order.customerPhone}</div>
                      {order.employeeName && (
                        <div className="text-indigo-500 text-[10px] mt-1">الموظف: {order.employeeName}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-800">{order.subject}</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">
                        {order.bookType || 'عربي'}
                      </span>
                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">
                        {order.publisherName || 'غير محدد'}
                      </span>
                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">
                        {order.academicYearName || 'غير محدد'}
                      </span>
                      {order.invoiceNumber && (
                        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold">
                          فاتورة: {order.invoiceNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-col">
                    <span className="text-gray-900 font-medium">الكمية: {order.quantity}</span>
                    <span className="text-indigo-600 text-xs font-bold">
                      {Number(order.deposit)} جنيه (
                      {order.paymentMethodName || 'نقدي'})
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-col text-xs space-y-1">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Calendar className="h-3 w-3" />
                      <span>الحجز: {order.receivedDate}</span>
                    </div>
                    <div className="flex items-center gap-1 text-orange-600 font-medium">
                      <Calendar className="h-3 w-3" />
                      <span>التسليم: {order.expectedDeliveryDate}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="relative">
                    <select
                      value={order.status}
                      onChange={(e) => onStatusChange(order.id, e.target.value as OrderStatus)}
                      className={`px-3 py-1 pr-8 rounded-full text-xs font-bold border cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 appearance-none transition-all ${statusColors[order.status]}`}
                    >
                      {Object.values(OrderStatus).map((s) => (
                        <option key={s} value={s}>
                          {statusTranslations[s]}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                      <Filter className="h-3 w-3 opacity-50" />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-center">
                  <div className="flex items-center justify-center space-x-2 space-x-reverse">
                    <button
                      onClick={() => onEdit(order)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                      title="تعديل الطلب"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onProfessionalPDF(order)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                      title="تقرير الإدارة (PDF)"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onReceiptPDF(order)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                      title="تحميل وصل PDF"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDirectPrint(order)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                      title="طباعة مباشرة"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => onDelete(order)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        title="إلغاء الطلب"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default OrderTable;
