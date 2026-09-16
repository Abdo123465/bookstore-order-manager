import React, { forwardRef } from 'react';
import { BookStatus, OrderStatus, OrderWithDetails } from '../../types';

interface BatchReportProps {
  orders: OrderWithDetails[];
}

const BatchReport = forwardRef<HTMLDivElement, BatchReportProps>(
  ({ orders }, ref) => {
    const activeOrders = orders
      .map(order => ({
        ...order,
        pendingItems: order.items?.filter(
          item => item.status !== BookStatus.Delivered && item.status !== BookStatus.Cancelled
        ) || [],
      }))
      .filter(order => {
        if (order.items && order.items.length > 0) {
          return order.pendingItems.length > 0;
        }
        return order.status !== OrderStatus.Delivered;
      });

    return (
      <div ref={ref} className="bg-white text-gray-900" dir="rtl">
        {activeOrders.map((order, orderIdx, currentFiltered) => (
          <div
            key={order.id}
            className="report-page p-8 bg-white"
            style={{
              minHeight: '1100px',
              width: '800px',
              fontFamily: 'Arial, sans-serif',
              pageBreakAfter: 'always',
            }}
          >
            <div className="text-center mb-6 border-b-4 border-black pb-4">
              <h1 className="text-4xl font-black mb-3">
                تقرير حجز كتب - طلب #{orderIdx + 1}
              </h1>
              <div className="flex justify-between items-center px-4">
                <p className="text-2xl font-bold">
                  صفحة {orderIdx + 1} من {currentFiltered.length}
                </p>
                <p className="text-2xl font-bold">
                  التاريخ: {new Date().toLocaleDateString('ar-EG')}
                </p>
              </div>
            </div>

            <div className="border-4 border-black rounded-lg p-6 mb-6 bg-gray-100">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xl font-bold text-gray-600 mb-1">اسم العميل</p>
                  <p className="text-4xl font-black text-black">{order.customerName}</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-600 mb-1">رقم الهاتف</p>
                  <p className="text-4xl font-black text-black">{order.customerPhone}</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-600 mb-1">إجمالي الكمية (المتبقية)</p>
                  <p className="text-5xl font-black text-black">
                    {order.items && order.items.length > 0
                      ? order.pendingItems.reduce((sum, item) => sum + item.quantity, 0)
                      : order.quantity}
                  </p>
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-600 mb-1">العربون المدفوع</p>
                  <p className="text-5xl font-black text-black">
                    {Number(order.deposit).toFixed(0)} جنيه
                  </p>
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-600 mb-1">الموظف المسؤول</p>
                  <p className="text-3xl font-black text-black">{order.employeeName || '-'}</p>
                </div>
              </div>
              {order.notes ? (
                <div className="mt-4 border-t-2 border-black pt-3">
                  <span className="text-xl font-bold text-gray-600 ml-2">ملاحظات:</span>
                  <span className="text-xl font-black text-black">{order.notes}</span>
                </div>
              ) : null}
              {order.invoiceNumber ? (
                <div className="mt-3 border-t-2 border-black pt-3">
                  <span className="text-xl font-bold text-gray-600 ml-2">رقم الفاتورة:</span>
                  <span className="text-xl font-black text-black">{order.invoiceNumber}</span>
                </div>
              ) : null}
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-black mb-4 border-b-2 border-black pb-2">
                📚 قائمة الكتب المتبقية ({order.items && order.items.length > 0 ? order.pendingItems.length : 1} كتاب)
              </h2>
              <table className="w-full border-collapse border-2 border-black">
                <thead>
                  <tr className="bg-gray-300 border-b-2 border-black">
                    <th className="border-2 border-black p-3 text-right text-lg font-black" style={{ width: '40px' }}>#</th>
                    <th className="border-2 border-black p-3 text-right text-lg font-black">اسم الكتاب</th>
                    <th className="border-2 border-black p-3 text-center text-lg font-black" style={{ width: '100px' }}>السنة</th>
                    <th className="border-2 border-black p-3 text-center text-lg font-black" style={{ width: '100px' }}>الناشر</th>
                    <th className="border-2 border-black p-3 text-center text-lg font-black" style={{ width: '90px' }}>النوع</th>
                    <th className="border-2 border-black p-3 text-center text-lg font-black" style={{ width: '70px' }}>الكمية</th>
                    <th className="border-2 border-black p-3 text-center text-lg font-black" style={{ width: '80px' }}>عربون الكتاب</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items && order.items.length > 0 ? (
                    order.pendingItems.map((item, i) => (
                      <tr key={i} className="border-b-2 border-black">
                        <td className="border-2 border-black p-3 text-center font-black text-xl">{i + 1}</td>
                        <td className="border-2 border-black p-3 font-black text-xl">{item.bookName || order.subject || '-'}</td>
                        <td className="border-2 border-black p-3 text-center font-bold text-lg">{item.grade || order.academicYearName || '-'}</td>
                        <td className="border-2 border-black p-3 text-center font-bold text-lg">{item.publisherName || '-'}</td>
                        <td className="border-2 border-black p-3 text-center font-bold text-lg">{item.type || order.bookType || 'عربي'}</td>
                        <td className="border-2 border-black p-3 text-center font-black text-2xl">{item.quantity}</td>
                        <td className="border-2 border-black p-3 text-center font-black text-xl">
                          {item.deposit !== undefined && item.deposit !== null ? Number(item.deposit).toFixed(0) : '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-b-2 border-black">
                      <td className="border-2 border-black p-3 text-center font-black text-xl">1</td>
                      <td className="border-2 border-black p-3 font-black text-xl">{order.subject || '-'}</td>
                      <td className="border-2 border-black p-3 text-center font-bold text-lg">{order.academicYearName || '-'}</td>
                      <td className="border-2 border-black p-3 text-center font-bold text-lg">{order.publisherName || '-'}</td>
                      <td className="border-2 border-black p-3 text-center font-bold text-lg">{order.bookType || 'عربي'}</td>
                      <td className="border-2 border-black p-3 text-center font-black text-2xl">{order.quantity}</td>
                      <td className="border-2 border-black p-3 text-center font-black text-xl">-</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {orderIdx === currentFiltered.length - 1 && (
              <div className="mt-auto pt-4">
                <div className="border-t-4 border-double border-black pt-4 bg-gray-200 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div className="font-bold text-2xl">
                      إجمالي الطلبات الفعالة:{' '}
                      <span className="mr-2 text-black text-3xl">{currentFiltered.length}</span>
                    </div>
                    <div className="font-bold text-2xl">
                      إجمالي العربون:{' '}
                      <span className="mr-2 text-black text-4xl font-black">
                        {currentFiltered
                          .reduce((sum: number, o: any) => sum + Number(o.deposit), 0)
                          .toFixed(0)}{' '}
                        جنيه
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <div className="font-bold text-xl">
                      إجمالي العربون الإضافي:{' '}
                      <span className="mr-2 text-black text-2xl font-black">
                        {currentFiltered
                          .reduce((sum: number, o: any) => sum + (Number(o.excess_deposit) || 0), 0)
                          .toFixed(0)}{' '}
                        جنيه
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }
);

BatchReport.displayName = 'BatchReport';
export default BatchReport;
