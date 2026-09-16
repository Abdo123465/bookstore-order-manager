import jsPDF from 'jspdf';
import { toJpeg } from 'html-to-image';

export async function exportReceiptPDF(
  element: HTMLElement,
  orderId: number,
  customerName: string,
): Promise<void> {
  const heightInPx = element.offsetHeight;
  const widthInPx = element.offsetWidth;
  const widthInMm = 72;
  const heightInMm = (heightInPx * widthInMm) / widthInPx;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [widthInMm, Math.max(80, heightInMm)],
  });

  const dataUrl = await toJpeg(element, {
    quality: 1.0,
    pixelRatio: 3,
    backgroundColor: '#ffffff',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
  pdf.save(`وصل_حجز_${orderId}_${customerName}.pdf`);
}
