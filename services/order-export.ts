import { OrderStatus, OrderWithDetails, BookStatus } from '../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { toJpeg } from 'html-to-image';

const statusTranslations: Record<OrderStatus, string> = {
  [OrderStatus.Pending]: 'قيد الانتظار',
  [OrderStatus.Delivered]: 'تم التسليم',
  [OrderStatus.Cancelled]: 'تم الإلغاء',
};

export function exportOrdersToExcel(orders: OrderWithDetails[]): void {
  const data = orders.map((order) => {
    const pendingItems = order.items?.filter(
      (item) => item.status !== BookStatus.Delivered && item.status !== BookStatus.Cancelled,
    ) || [];

    const isDelivered = order.items && order.items.length > 0
      ? pendingItems.length === 0
      : order.status === OrderStatus.Delivered;

    let itemsString = order.subject;
    if (order.items && order.items.length > 0) {
      itemsString = pendingItems
        .map((item) => {
          return `• ${item.bookName || 'كتاب'} (${item.quantity}) - ${item.type || 'عربي'} - ${item.publisherName || ''}`;
        })
        .join('\n');
    }

    return {
      'رقم الطلب': order.id,
      العميل: order.customerName,
      الهاتف: order.customerPhone,
      'السنة الدراسية': order.academicYearName || '-',
      'الكتب والتفاصيل': itemsString,
      العربون: Number(order.deposit),
      الموظف: order.employeeName || '-',
      'طريقة الدفع': order.paymentMethodName || '-',
      التاريخ: order.receivedDate,
      الحالة: statusTranslations[order.status],
      ملاحظات: order.notes || (isDelivered ? ' (تم تسليم جميع الكتب)' : ''),
    };
  }).filter(
    (row) => row['الكتب والتفاصيل'] !== '' || row.الحالة !== statusTranslations[OrderStatus.Delivered],
  );

  const ws = XLSX.utils.json_to_sheet(data);
  const colWidths = [
    { wch: 10 },
    { wch: 20 },
    { wch: 15 },
    { wch: 50 },
    { wch: 10 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 30 },
  ];
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Orders');
  XLSX.writeFile(wb, 'تقرير_الطلبات_المجمع.xlsx');
}

export async function exportOrdersToBatchPDF(reportElement: HTMLElement): Promise<void> {
  const pages = reportElement.querySelectorAll('.report-page');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  for (let i = 0; i < pages.length; i++) {
    if (i > 0) pdf.addPage();

    const dataUrl = await toJpeg(pages[i] as HTMLElement, {
      quality: 0.9,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const printableWidth = pdfWidth - margin * 2;
    const printableHeight = pdfHeight - margin * 2;

    const imgProps = pdf.getImageProperties(dataUrl);
    const ratio = imgProps.width / imgProps.height;
    let imgWidth = printableWidth;
    let imgHeight = imgWidth / ratio;

    if (imgHeight > printableHeight) {
      imgHeight = printableHeight;
      imgWidth = imgHeight * ratio;
    }

    const x = margin + (printableWidth - imgWidth) / 2;
    const y = margin + (printableHeight - imgHeight) / 2;

    pdf.addImage(dataUrl, 'JPEG', x, y, imgWidth, imgHeight);
  }

  pdf.save('تقرير_الطلبات.pdf');
}

export async function exportManifestPDF(reportElement: HTMLElement): Promise<void> {
  const pages = reportElement.querySelectorAll('.report-page');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  for (let i = 0; i < pages.length; i++) {
    if (i > 0) pdf.addPage();

    const dataUrl = await toJpeg(pages[i] as HTMLElement, {
      quality: 0.9,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const printableWidth = pdfWidth - margin * 2;
    const printableHeight = pdfHeight - margin * 2;

    const imgProps = pdf.getImageProperties(dataUrl);
    const ratio = imgProps.width / imgProps.height;
    let imgWidth = printableWidth;
    let imgHeight = imgWidth / ratio;

    if (imgHeight > printableHeight) {
      imgHeight = printableHeight;
      imgWidth = imgHeight * ratio;
    }

    const x = margin + (printableWidth - imgWidth) / 2;
    const y = margin + (printableHeight - imgHeight) / 2;

    pdf.addImage(dataUrl, 'JPEG', x, y, imgWidth, imgHeight);
  }

  pdf.save('تقرير_المندوب.pdf');
}

export function exportManifestToExcel(orders: OrderWithDetails[]): void {
  const data: any[] = [];
  const manifestMap: Record<string, { grade: string; publisher: string; bookName: string; count: number }> = {};

  let counter = 1;
  orders.forEach((order) => {
    const pendingItems = order.items?.filter((item) => item.status === BookStatus.Pending) || [];
    pendingItems.forEach((item) => {
      const grade = item.grade || order.academicYearName || 'غير محدد';
      const publisher = item.publisherName || 'غير محدد';
      const bookName = item.bookName || order.subject || 'غير محدد';
      const key = `${grade}-${publisher}-${bookName}`;

      if (!manifestMap[key]) {
        manifestMap[key] = { grade, publisher, bookName, count: 0 };
      }
      manifestMap[key].count += item.quantity;
    });
  });

  Object.values(manifestMap).forEach((entry) => {
    data.push({
      'م': counter++,
      'الصف': entry.grade,
      'الناشر': entry.publisher,
      'الكتاب': entry.bookName,
      'العدد': entry.count,
    });
  });

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 10 }];
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'كتب خارجيه');
  XLSX.writeFile(wb, 'تقرير_المندوب_المجمّع.xlsx');
}
