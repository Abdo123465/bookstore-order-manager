import jsPDF from 'jspdf';
import { toJpeg } from 'html-to-image';

export async function exportProfessionalPDF(
  containerElement: HTMLElement,
  orderId: number,
  customerName: string,
): Promise<void> {
  const pages = containerElement.querySelectorAll('.report-page');
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

    pdf.addImage(dataUrl, 'JPEG', x, margin, imgWidth, imgHeight);
  }

  pdf.save(`تقرير_حجز_${orderId}_${customerName}.pdf`);
}
