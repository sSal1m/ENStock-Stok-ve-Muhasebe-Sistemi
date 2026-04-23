import { RobotoRegularBase64 } from './fonts/Roboto-Regular';


export interface PdfInvoiceData {
  // Şirket bilgileri
  companyName: string;
  companyAddress: string;
  companyTaxId: string;
  companyLogoUrl?: string | null;
  
  // Fatura bilgileri
  invoiceNumber: string;
  issueDate: string;
  currency: string;
  status: string;
  notes?: string;
  
  // Cari bilgileri
  contactName: string;
  contactTaxNumber?: string;
  contactTaxOffice?: string;
  
  // Kalemler
  items: {
    productName: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    lineTotal: number;
  }[];
  
  // Toplamlar
  subtotal: number;
  vatTotal: number;
  grandTotal: number;
}

export async function generateInvoicePdf(data: PdfInvoiceData, documentType: 'invoice' | 'quotation' = 'invoice'): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();
  
  // Add Roboto font with fallback
  let fontName = 'helvetica';
  try {
    doc.addFileToVFS('Roboto-Regular.ttf', RobotoRegularBase64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.setFont('Roboto');
    fontName = 'Roboto';
  } catch (fontError) {
    console.warn('Roboto font yüklenemedi, Helvetica kullanılıyor:', fontError);
    doc.setFont('helvetica');
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 20;

  // Colors based on document type
  const isQuotation = documentType === 'quotation';
  const primaryColor = isQuotation ? [15, 118, 110] : [109, 40, 217]; // Teal for quotation, Purple for invoice
  const textColor = [51, 65, 85];
  const lightGray = [148, 163, 184];

  // Document Title (Top Right)
  doc.setFontSize(24);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  const titleText = isQuotation ? 'TEKLİF / PROFORMA' : 'FATURA';
  doc.text(titleText, pageWidth - 20, currentY, { align: 'right' });

  doc.setFontSize(10);
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.text(`Tarih: ${new Date(data.issueDate).toLocaleDateString('tr-TR')}`, pageWidth - 20, currentY + 8, { align: 'right' });
  doc.text(`No: ${data.invoiceNumber || 'Belirtilmemiş'}`, pageWidth - 20, currentY + 14, { align: 'right' });

  // Company Information (Top Left)
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(data.companyName || 'Şirket Adı Belirtilmemiş', 20, currentY);
  
  doc.setFontSize(10);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  // Use splitTextToSize to handle long addresses
  const splitAddress = doc.splitTextToSize(data.companyAddress || '', 80);
  doc.text(splitAddress, 20, currentY + 8);
  
  const addressHeight = splitAddress.length * 5;
  doc.text(`Vergi No: ${data.companyTaxId || '-'}`, 20, currentY + 8 + addressHeight + 2);

  currentY = Math.max(currentY + 8 + addressHeight + 15, currentY + 30);

  // Line separator
  doc.setDrawColor(226, 232, 240);
  doc.line(20, currentY, pageWidth - 20, currentY);
  currentY += 15;

  // Contact Information (Billing To)
  doc.setFontSize(10);
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.text('SAYIN / MÜŞTERİ', 20, currentY);
  
  currentY += 8;
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(data.contactName || 'Cari Belirtilmemiş', 20, currentY);
  
  currentY += 6;
  doc.setFontSize(10);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  if (data.contactTaxNumber) {
    let taxInfo = `Vergi No / TC: ${data.contactTaxNumber}`;
    if (data.contactTaxOffice) {
      taxInfo += ` | VD: ${data.contactTaxOffice}`;
    }
    doc.text(taxInfo, 20, currentY);
  }

  currentY += 15;

  // Currency Formatter
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: data.currency || 'TRY',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Items Table
  const tableData = data.items.map((item, index) => [
    (index + 1).toString(),
    item.productName,
    item.quantity.toString(),
    formatCurrency(item.unitPrice),
    `%${item.vatRate}`,
    formatCurrency(item.lineTotal)
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Ürün / Hizmet', 'Miktar', 'Birim Fiyat', 'KDV', 'Toplam']],
    body: tableData,
    theme: 'grid',
    styles: {
      font: fontName,
      fontSize: 9,
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: 255,
      halign: 'left',
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 15, halign: 'center' },
      5: { cellWidth: 35, halign: 'right' },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Totals Section
  const totalsX = pageWidth - 20; // Right align anchor
  const valueWidth = 40; // Width of the value column for alignment

  doc.setFontSize(10);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text('Ara Toplam:', totalsX - valueWidth - 5, currentY, { align: 'right' });
  doc.text(formatCurrency(data.subtotal), totalsX, currentY, { align: 'right' });

  currentY += 8;
  doc.text('KDV Toplamı:', totalsX - valueWidth - 5, currentY, { align: 'right' });
  doc.text(formatCurrency(data.vatTotal), totalsX, currentY, { align: 'right' });

  currentY += 6;
  doc.setDrawColor(226, 232, 240);
  doc.line(totalsX - valueWidth - 25, currentY, totalsX, currentY);
  
  currentY += 8;
  doc.setFontSize(12);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('GENEL TOPLAM:', totalsX - valueWidth - 5, currentY, { align: 'right' });
  doc.text(formatCurrency(data.grandTotal), totalsX, currentY, { align: 'right' });

  // Notes Section
  if (data.notes) {
    currentY += 20;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Notlar:', 20, currentY);
    
    currentY += 6;
    doc.setFontSize(9);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    const splitNotes = doc.splitTextToSize(data.notes, pageWidth - 40);
    doc.text(splitNotes, 20, currentY);
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setFontSize(8);
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  const footerText = 'Bu belge elektronik ortamda sistem tarafından otomatik oluşturulmuştur.';
  doc.text(footerText, pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Tarih: ${new Date().toLocaleString('tr-TR')}`, pageWidth / 2, footerY + 5, { align: 'center' });

  // Download
  const filename = `${isQuotation ? 'Teklif' : 'Fatura'}_${data.invoiceNumber || new Date().getTime()}.pdf`;
  doc.save(filename);
}
