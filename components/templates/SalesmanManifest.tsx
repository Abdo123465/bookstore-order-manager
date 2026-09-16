import React, { forwardRef, useMemo } from 'react';
import { BookStatus, OrderWithDetails } from '../../types';

interface SalesmanManifestProps {
  orders: OrderWithDetails[];
}

interface BookEntry {
  totalQuantity: number;
  customers: { name: string; phone: string; deposit: number }[];
}

const SalesmanManifest = forwardRef<HTMLDivElement, SalesmanManifestProps>(
  ({ orders }, ref) => {
    const manifestData = useMemo(() => {
      const data: Record<string, Record<string, Record<string, Record<string, BookEntry>>>> = {};

      orders.forEach((order) => {
        const pendingItems = order.items?.filter(
          (item) => item.status === BookStatus.Pending,
        ) || [];

        if (pendingItems.length === 0) return;

        pendingItems.forEach((item) => {
          const grade = item.grade || order.academicYearName || 'غير محدد';
          const type = item.type || 'عربي';
          const publisher = item.publisherName || 'غير محدد';
          const bookName = item.bookName || order.subject || 'غير محدد';

          if (!data[grade]) data[grade] = {};
          if (!data[grade][type]) data[grade][type] = {};
          if (!data[grade][type][publisher]) data[grade][type][publisher] = {};
          if (!data[grade][type][publisher][bookName]) {
            data[grade][type][publisher][bookName] = { totalQuantity: 0, customers: [] };
          }

          data[grade][type][publisher][bookName].totalQuantity += item.quantity;
          data[grade][type][publisher][bookName].customers.push({
            name: order.customerName,
            phone: order.customerPhone,
            deposit: order.deposit || 0,
          });
        });
      });

      return data;
    }, [orders]);

    const totalQuantity = useMemo(() => {
      let sum = 0;
      Object.values(manifestData).forEach((grades) =>
        Object.values(grades).forEach((types) =>
          Object.values(types).forEach((publishers) =>
            Object.values(publishers).forEach((book) => {
              sum += book.totalQuantity;
            }),
          ),
        ),
      );
      return sum;
    }, [manifestData]);

    const totalCustomers = useMemo(() => {
      let count = 0;
      Object.values(manifestData).forEach((grades) =>
        Object.values(grades).forEach((types) =>
          Object.values(types).forEach((publishers) =>
            Object.values(publishers).forEach((book) => {
              count += book.customers.length;
            }),
          ),
        ),
      );
      return count;
    }, [manifestData]);

    return (
      <div ref={ref} className="bg-white text-gray-900" dir="rtl" style={{ width: '800px' }}>
        <div className="report-page p-8 bg-white" style={{ minHeight: '1100px', width: '800px', fontFamily: 'Arial, sans-serif', pageBreakAfter: 'always' }}>
          <div className="text-center mb-8 border-b-4 border-black pb-4">
            <h1 className="text-4xl font-black mb-3">تقرير المندوب المجمّع</h1>
            <div className="flex justify-between items-center px-4">
              <p className="text-2xl font-bold">صفحة 1 من 1</p>
              <p className="text-2xl font-bold">التاريخ: {new Date().toLocaleDateString('ar-EG')}</p>
            </div>
          </div>

          <div className="border-4 border-black rounded-lg p-6 mb-6 bg-gray-100">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xl font-bold text-gray-600 mb-1">إجمالي الكتب المعلّقة</p>
                <p className="text-5xl font-black text-black">{totalQuantity}</p>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-600 mb-1">إجمالي العملاء</p>
                <p className="text-5xl font-black text-black">{totalCustomers}</p>
              </div>
            </div>
          </div>

          {Object.keys(manifestData).length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-2xl font-bold">
              لا توجد كتب معلّقة
            </div>
          ) : (
            Object.entries(manifestData).map(([grade, gradesData]) => (
              <div key={grade} className="mb-6">
                <h2 className="text-2xl font-black mb-3 border-b-2 border-black pb-2">
                  السنة الدراسية: {grade}
                </h2>

                {Object.entries(gradesData).map(([type, typesData]) => (
                  <div key={type} className="mb-4">
                    <h3 className="text-lg font-bold mb-2 text-indigo-700">النوع: {type}</h3>

                    {Object.entries(typesData).map(([publisher, publishersData]) => (
                      <div key={publisher} className="mb-3">
                        <h4 className="text-base font-bold mb-2">دار النشر: {publisher}</h4>

                        <table className="w-full border-collapse border-2 border-black text-sm">
                          <thead>
                            <tr className="bg-gray-200">
                              <th className="border-2 border-black p-2 text-right font-black">اسم الكتاب</th>
                              <th className="border-2 border-black p-2 text-center font-black" style={{ width: '80px' }}>إجمالي العدد</th>
                              <th className="border-2 border-black p-2 text-right font-black">قائمة العملاء وتفاصيل الدفع</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(publishersData).map(([bookName, bookEntry]) => (
                              <tr key={bookName}>
                                <td className="border-2 border-black p-2 font-black">{bookName}</td>
                                <td className="border-2 border-black p-2 text-center font-black text-xl">{bookEntry.totalQuantity}</td>
                                <td className="border-2 border-black p-2">
                                  {bookEntry.customers.map((cust, idx) => (
                                    <div key={idx} className="mb-1">
                                      {cust.name} ({cust.phone}) - <span className="font-bold text-green-700">عربون: {cust.deposit} ج</span>
                                    </div>
                                  ))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    );
  },
);

SalesmanManifest.displayName = 'SalesmanManifest';
export default SalesmanManifest;
