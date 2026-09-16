import React, { forwardRef } from 'react';
import { OrderWithDetails } from '../../types';

interface ThermalReceiptProps {
  order: OrderWithDetails | null;
}

const ThermalReceipt = forwardRef<HTMLDivElement, ThermalReceiptProps>(
  ({ order }, ref) => {
    if (!order) return null;

    return (
      <div
        ref={ref}
        className="bg-white text-black p-4"
        dir="rtl"
        style={{
          fontFamily: 'Arial, sans-serif',
          width: '300px',
          minHeight: '400px',
          height: 'auto',
          overflow: 'visible',
        }}
      >
        <div className="text-center mb-2 border-b-2 border-black pb-2">
          <h1 className="text-2xl font-black">مكتبة تفانين</h1>
          <p className="text-sm font-bold">لحجز الكتب المدرسية</p>
        </div>

        <div className="mb-2 text-sm border-b border-dashed border-gray-400 pb-1">
          <div className="flex justify-between">
            <span className="font-bold">رقم الوصل: <span className="font-black">#{order.id}</span></span>
            <span>{order.receivedDate}</span>
          </div>
        </div>

        <div className="mb-2 p-2 bg-gray-50 rounded border-2 border-black">
          <div className="flex justify-between items-center">
            <span className="text-xl font-black">{order.customerName}</span>
            <span className="text-sm font-bold">{order.customerPhone}</span>
          </div>
        </div>

        <div className="mb-2">
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="border-b-2 border-black font-bold">
                <th className="py-1">الكتاب/المادة</th>
                <th className="py-1 text-center" style={{ width: '40px' }}>الكمية</th>
              </tr>
            </thead>
            <tbody>
              {order.items && order.items.length > 0 ? (
                order.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-200">
                    <td className="py-1">
                      <span className="font-bold">{item.bookName || order.subject}</span>
                      <div className="text-xs text-gray-500">({item.publisherName || '-'})</div>
                    </td>
                    <td className="py-1 text-center font-black text-lg">{item.quantity}</td>
                  </tr>
                ))
              ) : (
                <tr className="border-b border-gray-200">
                  <td className="py-1">
                    <span className="font-bold">{order.subject}</span>
                    <div className="text-xs text-gray-500">({order.publisherName || '-'})</div>
                  </td>
                  <td className="py-1 text-center font-black text-lg">{order.quantity}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t-2 border-black pt-2 mb-2">
          <div className="flex justify-between text-lg font-black bg-gray-100 p-2 rounded">
            <span>العربون المدفوع:</span>
            <span>{Number(order.deposit).toFixed(2)} ج</span>
          </div>
        </div>

        <div className="text-center mt-4 border-t border-dashed border-gray-400 pt-2">
          <p className="text-sm font-bold">شكراً لتعاملك معنا</p>
          <p className="text-xs text-gray-600">يُرجى الاحتفاظ بالوصل للاستلام</p>
        </div>
      </div>
    );
  }
);

ThermalReceipt.displayName = 'ThermalReceipt';
export default ThermalReceipt;
