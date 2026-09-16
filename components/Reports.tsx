import React, { useState, useEffect, useMemo } from 'react';
import { OrderStatus, Order, BookStatus, BookType } from '../types';
import { loadReferenceData } from '../services/reference-cache';

interface ReportsProps {
  orders: any[];
}

const statusTranslations: Record<OrderStatus, string> = {
  [OrderStatus.Pending]: 'قيد الانتظار',
  [OrderStatus.Delivered]: 'تم التسليم',
  [OrderStatus.Cancelled]: 'تم الإلغاء'
};

const bookStatusTranslations: Record<BookStatus, string> = {
  [BookStatus.Pending]: 'قيد الانتظار',
  [BookStatus.Delivered]: 'تم التسليم',
  [BookStatus.Cancelled]: 'تم الإلغاء'
};

const Reports: React.FC<ReportsProps> = ({ orders }) => {
  const [bookTypes, setBookTypes] = useState<BookType[]>([]);

  useEffect(() => {
    loadReferenceData().then(data => setBookTypes(data.bookTypes)).catch(() => {});
  }, []);

  const totalOrders = orders.length;

  const { totalDeposits, statusCounts, bookStatusCounts, typeCounts, dailyCounts } = useMemo(() => {
    let deposits = 0;
    const statusAcc: Record<string, number> = {};
    const bookStatusAcc: Record<string, number> = {};
    const typeAcc: Record<string, number> = {};
    const dailyAcc: Record<string, number> = {};

    for (const o of orders) {
      deposits += (parseFloat(o.deposit) || 0);
      statusAcc[o.status] = (statusAcc[o.status] || 0) + 1;
      typeAcc[o.bookType || 'عربي'] = (typeAcc[o.bookType || 'عربي'] || 0) + 1;

      const date = o.createdAt ? new Date(o.createdAt).toLocaleDateString() : 'غير معروف';
      dailyAcc[date] = (dailyAcc[date] || 0) + 1;

      if (o.items && Array.isArray(o.items)) {
        o.items.forEach((item: any) => {
          const status = item.status || BookStatus.Pending;
          bookStatusAcc[status] = (bookStatusAcc[status] || 0) + (item.quantity || 1);
        });
      } else {
        const status = o.status === OrderStatus.Delivered ? BookStatus.Delivered : BookStatus.Pending;
        bookStatusAcc[status] = (bookStatusAcc[status] || 0) + (o.quantity || 1);
      }
    }

    return {
      totalDeposits: deposits,
      statusCounts: statusAcc,
      bookStatusCounts: bookStatusAcc,
      typeCounts: typeAcc,
      dailyCounts: dailyAcc,
    };
  }, [orders]);

  const sortedDates = useMemo(() => {
    return Object.keys(dailyCounts).sort((a, b) => {
      if (a === 'غير معروف') return 1;
      if (b === 'غير معروف') return -1;
      return new Date(b).getTime() - new Date(a).getTime();
    });
  }, [dailyCounts]);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">إجمالي الطلبات</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{totalOrders}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">إجمالي العربون المحصل</h3>
            <p className="text-3xl font-bold text-indigo-600 mt-2">{totalDeposits.toFixed(2)} جنيه</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Order Status Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
             <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">حالات الطلبات</h3>
             </div>
             <table className="w-full text-right text-sm">
                <tbody className="divide-y divide-gray-100">
                    {Object.values(OrderStatus).map(status => (
                        <tr key={status}>
                            <td className="px-6 py-3 text-gray-600">{statusTranslations[status]}</td>
                            <td className="px-6 py-3 font-medium text-left text-gray-900">{statusCounts[status] || 0}</td>
                        </tr>
                    ))}
                </tbody>
             </table>
          </div>

          {/* Book Status Breakdown (New) */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
             <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">توزيع الكتب (بالكمية)</h3>
             </div>
             <table className="w-full text-right text-sm">
                <tbody className="divide-y divide-gray-100">
                    {Object.values(BookStatus).map(status => (
                        <tr key={status}>
                            <td className="px-6 py-3 text-gray-600">{bookStatusTranslations[status]}</td>
                            <td className="px-6 py-3 font-medium text-left text-gray-900">{bookStatusCounts[status] || 0}</td>
                        </tr>
                    ))}
                </tbody>
             </table>
          </div>

          {/* Book Type Breakdown Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
             <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">توزيع نوع الكتب</h3>
             </div>
             <table className="w-full text-right text-sm">
                <tbody className="divide-y divide-gray-100">
                    {bookTypes.map(bt => (
                      <tr key={bt.id}>
                        <td className="px-6 py-3 text-gray-600">{bt.name}</td>
                        <td className="px-6 py-3 font-medium text-left text-gray-900">{typeCounts[bt.name] || 0}</td>
                      </tr>
                    ))}
                </tbody>
             </table>
          </div>

          {/* Daily Activity Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
             <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">الطلبات اليومية</h3>
             </div>
             <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-right text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0">
                        <tr>
                            <th className="px-6 py-2 font-medium">التاريخ</th>
                            <th className="px-6 py-2 font-medium text-left">العدد</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {sortedDates.length === 0 ? (
                             <tr><td colSpan={2} className="px-6 py-4 text-center text-gray-400">لا توجد بيانات متاحة</td></tr>
                        ) : (
                            sortedDates.map(date => (
                                <tr key={date}>
                                    <td className="px-6 py-3 text-gray-600">{date}</td>
                                    <td className="px-6 py-3 font-medium text-left text-gray-900">{dailyCounts[date]}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
             </div>
          </div>
      </div>

      {/* Detailed Orders Report */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-semibold text-gray-800">تقرير تفصيلي بحالة الكتب لكل طلب</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-bold">#</th>
                <th className="px-6 py-4 font-bold">العميل</th>
                <th className="px-6 py-4 font-bold">الكتب وحالتها</th>
                <th className="px-6 py-4 font-bold">حالة الطلب</th>
                <th className="px-6 py-4 font-bold">العربون</th>
                <th className="px-6 py-4 font-bold">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">لا توجد طلبات مسجلة</td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{order.id}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{order.customerName}</div>
                      <div className="text-xs text-gray-500">{order.customerPhone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1.5 max-w-xs">
                        {order.items && order.items.length > 0 ? (
                          order.items.map((item, i) => (
                            <div key={i} className="flex items-center justify-between gap-2 text-xs border-b border-gray-50 pb-1 last:border-0">
                              <span className="font-medium text-gray-700 truncate">{item.bookName}</span>
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                item.status === BookStatus.Delivered ? 'bg-green-100 text-green-700' :
                                item.status === BookStatus.Cancelled ? 'bg-red-100 text-red-700 line-through' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {bookStatusTranslations[item.status as BookStatus] || 'انتظار'}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-medium text-gray-700">{order.subject}</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                              order.status === OrderStatus.Delivered ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {order.status === OrderStatus.Delivered ? 'تم التسليم' : 'قيد الانتظار'}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        order.status === OrderStatus.Delivered ? 'bg-green-100 text-green-700' :
                        order.status === OrderStatus.Cancelled ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {statusTranslations[order.status as OrderStatus]}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">{Number(order.deposit).toFixed(2)}</td>
                    <td className="px-6 py-4 text-gray-500 text-xs">{order.receivedDate}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;