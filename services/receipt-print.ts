import { OrderWithDetails } from '../types';

export interface PrintResult {
  success: boolean;
  failureReason?: string;
}

function buildReceiptHtml(order: OrderWithDetails): string {
  return `
    <!DOCTYPE html>
    <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <style>
          @page { margin: 0; }
          body { 
            margin: 0; 
            padding: 0; 
            font-family: Arial, sans-serif; 
            width: 72mm; 
            background: white;
            display: flex;
            justify-content: center;
          }
          .receipt-container { 
            width: 72mm; 
            padding: 4mm; 
            box-sizing: border-box; 
            min-height: 80mm;
            border: none;
          }
          .text-center { text-align: center; }
          .mb-1 { margin-bottom: 6px; }
          .mb-2 { margin-bottom: 10px; }
          .border-b { border-bottom: 2px solid black; }
          .border-b-thin { border-bottom: 1px solid black; }
          .pb-1 { padding-bottom: 6px; }
          .font-black { font-weight: 900; }
          .font-bold { font-weight: bold; }
          .text-2xl { font-size: 24px; }
          .text-xl { font-size: 20px; }
          .text-lg { font-size: 18px; }
          .text-md { font-size: 16px; }
          .text-sm { font-size: 14px; }
          .text-xs { font-size: 12px; }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .items-center { align-items: center; }
          .bg-gray-50 { background-color: #f9fafb; }
          .bg-gray-100 { background-color: #f3f4f6; }
          .rounded { border-radius: 6px; }
          .border { border: 1.5px solid #000; }
          .p-1 { padding: 6px; }
          .p-2 { padding: 10px; }
          .w-full { width: 100%; }
          .text-right { text-align: right; }
          .border-dashed { border-style: dashed; }
          table { border-collapse: collapse; width: 100%; margin-top: 5px; }
          th, td { padding: 5px 2px; text-align: right; border-bottom: 1px solid #eee; }
          th { border-bottom: 2px solid black; }
          .total-row { background-color: #eee; font-weight: 900; padding: 8px 4px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="text-center mb-2 border-b pb-1">
            <h1 class="text-2xl font-black" style="margin:0">مكتبة تفانين</h1>
            <p class="text-sm font-bold" style="margin:2px 0 0 0">لحجز الكتب المدرسية</p>
          </div>

          <div class="mb-2 text-sm border-b-thin border-dashed pb-1">
            <div class="flex justify-between">
              <span class="font-bold">رقم الوصل: <span class="font-black">#${order.id}</span></span>
              <span>${order.receivedDate}</span>
            </div>
          </div>

          ${order.invoiceNumber ? `
          <div class="mb-2 text-sm border-b-thin border-dashed pb-1">
            <span class="font-bold">رقم الفاتورة: <span class="font-black">${order.invoiceNumber}</span></span>
          </div>` : ''}

          <div class="mb-2 p-1 bg-gray-50 rounded border">
            <div class="flex justify-between items-center">
              <span class="text-lg font-black">${order.customerName}</span>
              <span class="text-sm font-bold">${order.customerPhone}</span>
            </div>
          </div>

          <div class="mb-2">
            <table>
              <thead>
                <tr class="font-bold text-sm">
                  <th class="py-1">الكتاب/المادة</th>
                  <th class="py-1 text-center" style="width: 40px">الكمية</th>
                </tr>
              </thead>
              <tbody class="text-sm">
                ${order.items && order.items.length > 0 ? 
                  order.items.map(item => `
                    <tr>
                      <td class="py-1">
                        <span class="font-bold">${item.bookName || order.subject}</span>
                        <div class="text-xs" style="color:#666">(${item.publisherName || '-'})</div>
                      </td>
                      <td class="py-1 text-center font-black text-md">${item.quantity}</td>
                    </tr>
                  `).join('') : `
                    <tr>
                      <td class="py-1">
                        <span class="font-bold">${order.subject}</span>
                        <div class="text-xs" style="color:#666">(${order.publisherName || '-'})</div>
                      </td>
                      <td class="py-1 text-center font-black text-md">${order.quantity}</td>
                    </tr>
                  `
                }
              </tbody>
            </table>
          </div>

          <div class="total-row flex justify-between rounded">
            <span class="text-md">العربون المدفوع:</span>
            <span class="text-xl">${Number(order.deposit).toFixed(2)} ج</span>
          </div>

          ${Number(order.excess_deposit || 0) > 0 ? `
          <div class="total-row flex justify-between rounded" style="margin-top:4px">
            <span class="text-md">العربون الإضافي:</span>
            <span class="text-xl">${Number(order.excess_deposit).toFixed(2)} ج</span>
          </div>` : ''}

          <div class="text-center mt-2 border-t border-dashed pt-2">
            <p class="text-md font-bold" style="margin:0">شكراً لتعاملك معنا</p>
            <p class="text-xs" style="color:#666; margin:2px 0 0 0">يُرجى الاحتفاظ بالوصل للاستلام</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function printReceipt(order: OrderWithDetails): Promise<PrintResult> {
  const html = buildReceiptHtml(order);
  // @ts-ignore
  const result = await window.electron.printReceipt(html);
  return result;
}
