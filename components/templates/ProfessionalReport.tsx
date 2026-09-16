import React, { forwardRef } from 'react';
import { BookStatus, OrderStatus, OrderWithDetails } from '../../types';

interface ProfessionalReportProps {
  order: OrderWithDetails | null;
}

const statusTranslations: Record<OrderStatus, string> = {
  [OrderStatus.Pending]: 'قيد الانتظار',
  [OrderStatus.Delivered]: 'تم التسليم',
  [OrderStatus.Cancelled]: 'تم الإلغاء',
};

function chunkArray<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size),
  );
}

const ProfessionalReport = forwardRef<HTMLDivElement, ProfessionalReportProps>(
  ({ order }, ref) => {
    if (!order) return null;

    const reportItems = order.status === OrderStatus.Pending
      ? (order.items || []).filter(item => item.status !== BookStatus.Delivered)
      : (order.items || []);

    return (
      <div ref={ref} className="bg-white text-black" dir="rtl" style={{ fontFamily: 'Arial, sans-serif' }}>
        {chunkArray<any>(reportItems, 15).map(
          (itemChunk: any[], pageIdx, allChunks) => (
            <div
              key={pageIdx}
              className="report-page p-8 bg-white"
              style={{ minHeight: '1130px', width: '800px' }}
            >
              <div className="text-center mb-8 border-b-2 border-black pb-4">
                <h1 className="text-3xl font-bold mb-2">تقرير تفصيلي لطلب حجز</h1>
                <div className="flex justify-between items-center px-4">
                  <p className="text-lg">صفحة {pageIdx + 1} من {allChunks.length}</p>
                  <p className="text-lg">تاريخ التقرير: {new Date().toLocaleDateString('ar-EG')}</p>
                </div>
              </div>

              {pageIdx === 0 && (
                <div className="border-2 border-black p-6 mb-8 text-base bg-gray-50 rounded-lg">
                  <h2 className="text-xl font-bold mb-4 border-b-2 border-black pb-2">
                    بيانات العميل والطلب
                  </h2>
                  <div className="grid grid-cols-2 gap-y-3">
                    <div className="flex gap-2">
                      <span className="font-bold text-gray-700">اسم العميل:</span>
                      <span className="font-black">{order.customerName || '-'}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-bold text-gray-700">رقم الهاتف:</span>
                      <span className="font-black">{order.customerPhone || '-'}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-bold text-gray-700">الموظف:</span>
                      <span className="font-black">{order.employeeName || '-'}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-bold text-gray-700">تاريخ الحجز:</span>
                      <span className="font-black">{order.receivedDate || '-'}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-bold text-gray-700">حالة الطلب:</span>
                      <span className="font-black text-indigo-700">
                        {statusTranslations[order.status]}
                      </span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="font-bold text-gray-700">العربون:</span>
                      <span className="font-black text-xl text-green-700">
                        {Number(order.deposit).toFixed(2)} جنيه
                      </span>
                    </div>
                    {order.notes ? (
                      <div className="flex gap-2 col-span-2">
                        <span className="font-bold text-gray-700">ملاحظات:</span>
                        <span className="font-black">{order.notes}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              <div className="mb-8 flex-grow">
                <h2 className="text-xl font-bold mb-4">تفاصيل الكتب المحجوزة</h2>
                <table className="w-full border-collapse border-2 border-black text-right text-sm table-fixed">
                  <thead>
                    <tr className="bg-gray-100 border-b-2 border-black">
                      <th style={{ width: '120px' }} className="border-2 border-black p-2 font-bold">دار النشر</th>
                      <th className="border-2 border-black p-2 font-bold">المادة</th>
                      <th style={{ width: '110px' }} className="border-2 border-black p-2 font-bold">السنة الدراسية</th>
                      <th style={{ width: '90px' }} className="border-2 border-black p-2 font-bold">نوع الكتاب</th>
                      <th style={{ width: '70px' }} className="border-2 border-black p-2 font-bold text-center">الكمية</th>
                      <th style={{ width: '90px' }} className="border-2 border-black p-2 font-bold text-center">عربون الكتاب</th>
                      <th style={{ width: '100px' }} className="border-2 border-black p-2 font-bold text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemChunk.length > 0
                      ? itemChunk.map((item: any, idx: number) => (
                          <tr key={idx} className="border-b-2 border-black">
                            <td className="border-2 border-black p-2 truncate">{item.publisherName || '-'}</td>
                            <td className="border-2 border-black p-2 font-bold">{item.bookName || order.subject || '-'}</td>
                            <td className="border-2 border-black p-2">{item.grade || order.academicYearName || '-'}</td>
                            <td className="border-2 border-black p-2 text-center">{item.type || '-'}</td>
                            <td className="border-2 border-black p-2 text-center font-bold text-lg">{item.quantity}</td>
                            <td className="border-2 border-black p-2 text-center font-bold">
                              {item.deposit !== undefined && item.deposit !== null ? Number(item.deposit).toFixed(2) : '-'}
                            </td>
                            <td className="border-2 border-black p-2 text-center font-bold">
                              {item.status === BookStatus.Delivered
                                ? 'تم التسليم'
                                : item.status === BookStatus.Cancelled
                                  ? 'تم الإلغاء'
                                  : 'قيد الانتظار'}
                            </td>
                          </tr>
                        ))
                      : pageIdx === 0 && (
                          <tr className="border-b-2 border-black">
                            <td className="border-2 border-black p-2">{order.publisherName || '-'}</td>
                            <td className="border-2 border-black p-2 font-bold">{order.subject || '-'}</td>
                            <td className="border-2 border-black p-2">{order.academicYearName || '-'}</td>
                            <td className="border-2 border-black p-2 text-center">{order.bookType || '-'}</td>
                            <td className="border-2 border-black p-2 text-center font-bold text-lg">{order.quantity}</td>
                            <td className="border-2 border-black p-2 text-center font-bold">-</td>
                            <td className="border-2 border-black p-2 text-center font-bold">
                              {statusTranslations[order.status]}
                            </td>
                          </tr>
                        )}
                  </tbody>
                </table>
              </div>

              {pageIdx === allChunks.length - 1 && (
                <div className="mt-auto pt-6 border-t-4 border-double border-black bg-gray-50 p-4 rounded-xl">
                  <div className="flex justify-between items-center">
                    <div className="text-xl font-bold">
                      إجمالي عدد الكتب:{' '}
                      <span className="mr-2 text-2xl text-indigo-900">
                        {reportItems.length > 0
                          ? reportItems.reduce((acc: number, item: any) => acc + item.quantity, 0)
                          : order.quantity}
                      </span>
                    </div>
                    <div className="text-xl font-bold">
                      إجمالي العربون:{' '}
                      <span className="mr-2 text-3xl font-black text-green-800">
                        {Number(order.deposit).toFixed(2)} جنيه
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <div className="text-lg font-bold">
                      العربون الإضافي:{' '}
                      <span className="mr-2 text-xl font-black text-green-700">
                        {Number(order.excess_deposit || 0).toFixed(2)} جنيه
                      </span>
                    </div>
                    {order.invoiceNumber && (
                      <div className="text-lg font-bold">
                        رقم الفاتورة:{' '}
                        <span className="mr-2 text-xl font-black text-indigo-900">{order.invoiceNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ),
        )}
      </div>
    );
  }
);

ProfessionalReport.displayName = 'ProfessionalReport';
export default ProfessionalReport;
