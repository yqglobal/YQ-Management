import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface InvoiceData {
  id?: string;
  invoiceNumber: string;
  status: string;
  createdAt: string;
  currency: string;
  subtotal: number;
  totalTax: number;
  total: number;
  taxLines?: Array<{ label: string; amount: number; rate?: number }>;
  lineItemsSnap?: Array<{ name: string; qty: number; unitPrice: number; taxable?: boolean }>;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  tenant?: {
    name?: string;
    taxConfig?: any;
  };
  notes?: string;
}

export function formatMoney(cents: number, currency: string = 'ZAR'): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'ZAR',
    }).format((cents || 0) / 100);
  } catch {
    return `${currency || 'ZAR'} ${((cents || 0) / 100).toFixed(2)}`;
  }
}

/**
 * Generates and downloads a clean, professional vector PDF for the invoice.
 */
export function downloadInvoicePdf(invoice: InvoiceData): boolean {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const currency = invoice.currency || 'ZAR';

    // Top primary decorative bar
    doc.setFillColor(37, 99, 235); // #2563eb
    doc.rect(0, 0, pageWidth, 5, 'F');

    // Header - Issuer (Left)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59); // Slate 800
    const tenantName = invoice.tenant?.name || 'YQ Management';
    doc.text(tenantName, 14, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text('Tax Invoice & Official Receipt', 14, 26);

    // Header - Invoice Meta (Right)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('TAX INVOICE', pageWidth - 14, 20, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(37, 99, 235);
    doc.text(invoice.invoiceNumber || 'INV-DRAFT', pageWidth - 14, 26, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    const dateStr = invoice.createdAt
      ? new Date(invoice.createdAt).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : new Date().toLocaleDateString();
    doc.text(`Date: ${dateStr}`, pageWidth - 14, 32, { align: 'right' });

    // Status Badge
    const statusText = (invoice.status || 'DRAFT').toUpperCase();
    const isPaid = statusText === 'PAID';
    if (isPaid) {
      doc.setFillColor(220, 252, 231); // green-100
      doc.setDrawColor(187, 247, 208);
      doc.setTextColor(21, 128, 61); // green-700
    } else {
      doc.setFillColor(254, 243, 199); // amber-100
      doc.setDrawColor(253, 230, 138);
      doc.setTextColor(180, 83, 9); // amber-700
    }
    const badgeWidth = 24;
    const badgeHeight = 6;
    const badgeX = pageWidth - 14 - badgeWidth;
    const badgeY = 35;
    doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(statusText, badgeX + badgeWidth / 2, badgeY + 4.2, { align: 'center' });

    // Divider
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.3);
    doc.line(14, 46, pageWidth - 14, 46);

    // Billed To Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('BILLED TO:', 14, 53);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42); // Slate 900
    const customerName = invoice.customer?.name || 'Customer';
    doc.text(customerName, 14, 59);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    let billY = 64;
    if (invoice.customer?.phone) {
      doc.text(invoice.customer.phone, 14, billY);
      billY += 4.5;
    }
    if (invoice.customer?.email) {
      doc.text(invoice.customer.email, 14, billY);
      billY += 4.5;
    }

    // Line Items Table
    const tableBody = (invoice.lineItemsSnap || []).map((item, index) => [
      (index + 1).toString(),
      item.name || 'Service Item',
      (item.qty || 1).toString(),
      formatMoney(item.unitPrice, currency),
      formatMoney((item.unitPrice || 0) * (item.qty || 1), currency),
    ]);

    autoTable(doc, {
      startY: Math.max(billY + 4, 75),
      head: [['#', 'ITEM / SERVICE DESCRIPTION', 'QTY', 'UNIT PRICE', 'TOTAL']],
      body: tableBody.length > 0 ? tableBody : [['1', 'General Service', '1', formatMoney(invoice.subtotal, currency), formatMoney(invoice.subtotal, currency)]],
      theme: 'plain',
      styles: {
        font: 'helvetica',
        fontSize: 9,
        textColor: [30, 41, 59],
        cellPadding: 3.5,
      },
      headStyles: {
        fillColor: [248, 250, 252], // Slate 50
        textColor: [71, 85, 105], // Slate 600
        fontStyle: 'bold',
        fontSize: 8.5,
        lineWidth: { bottom: 0.5 },
        lineColor: [203, 213, 225],
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255],
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center', textColor: [148, 163, 184] },
        1: { cellWidth: 'auto', fontStyle: 'bold' },
        2: { cellWidth: 16, halign: 'center' },
        3: { cellWidth: 32, halign: 'right' },
        4: { cellWidth: 34, halign: 'right', fontStyle: 'bold' },
      },
      tableLineColor: [226, 232, 240],
      tableLineWidth: 0.2,
      margin: { left: 14, right: 14 },
    });

    // Summary / Totals Block
    const finalY = (doc as any).lastAutoTable?.finalY || 120;
    const summaryX = pageWidth - 80;
    let currentY = finalY + 8;

    // Subtotal
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Subtotal:', summaryX, currentY);
    doc.setTextColor(30, 41, 59);
    doc.text(formatMoney(invoice.subtotal, currency), pageWidth - 14, currentY, { align: 'right' });
    currentY += 5.5;

    // Tax Lines
    if (invoice.taxLines && invoice.taxLines.length > 0) {
      invoice.taxLines.forEach((tax) => {
        doc.setTextColor(100, 116, 139);
        doc.text(`${tax.label}:`, summaryX, currentY);
        doc.setTextColor(30, 41, 59);
        doc.text(formatMoney(tax.amount, currency), pageWidth - 14, currentY, { align: 'right' });
        currentY += 5.5;
      });
    } else if (invoice.totalTax > 0) {
      doc.setTextColor(100, 116, 139);
      doc.text('Tax:', summaryX, currentY);
      doc.setTextColor(30, 41, 59);
      doc.text(formatMoney(invoice.totalTax, currency), pageWidth - 14, currentY, { align: 'right' });
      currentY += 5.5;
    }

    // Divider line before total
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(summaryX, currentY, pageWidth - 14, currentY);
    currentY += 5.5;

    // Grand Total box
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(summaryX - 4, currentY - 4, 70, 9, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Total:', summaryX, currentY + 2);
    doc.setTextColor(37, 99, 235);
    doc.text(formatMoney(invoice.total, currency), pageWidth - 14, currentY + 2, { align: 'right' });

    // Notes
    if (invoice.notes) {
      const noteY = Math.max(currentY + 18, 230);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Notes / Instructions:', 14, noteY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(invoice.notes, 14, noteY + 4.5);
    }

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(14, pageHeight - 16, pageWidth - 14, pageHeight - 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Thank you for your business! This is a system-generated tax invoice.', 14, pageHeight - 10);
    doc.text(tenantName, pageWidth - 14, pageHeight - 10, { align: 'right' });

    // Trigger save
    const fileName = `Invoice-${invoice.invoiceNumber || 'draft'}.pdf`;
    doc.save(fileName);
    return true;
  } catch (err) {
    console.error('Failed to generate PDF:', err);
    return false;
  }
}

/**
 * Opens a print-friendly window that formats the invoice cleanly for printing or saving to PDF via the browser.
 */
export function printInvoice(invoice: InvoiceData): boolean {
  try {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      return false;
    }

    const currency = invoice.currency || 'ZAR';
    const dateStr = invoice.createdAt
      ? new Date(invoice.createdAt).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : new Date().toLocaleDateString();

    const itemsRows = (invoice.lineItemsSnap || [])
      .map(
        (item, idx) => `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px;">${idx + 1}</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #1e293b; font-size: 13px;">${item.name}</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #334155; font-size: 13px;">${item.qty}</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #334155; font-size: 13px;">${formatMoney(item.unitPrice, currency)}</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600; color: #0f172a; font-size: 13px;">${formatMoney(item.unitPrice * item.qty, currency)}</td>
        </tr>
      `
      )
      .join('');

    const taxRows = (invoice.taxLines || [])
      .map(
        (tax) => `
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; color: #64748b;">
          <span>${tax.label}</span>
          <span style="font-weight: 500; color: #1e293b;">${formatMoney(tax.amount, currency)}</span>
        </div>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoiceNumber}</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: A4;
              margin: 15mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #0f172a;
              background: #fff;
              margin: 0;
              padding: 24px;
            }
            .invoice-box {
              max-width: 800px;
              margin: 0 auto;
            }
            .header-bar {
              height: 4px;
              background: #2563eb;
              margin-bottom: 24px;
              border-radius: 2px;
            }
            .flex-between {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 24px;
            }
            th {
              background: #f8fafc;
              text-align: left;
              padding: 10px 16px;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #64748b;
              border-bottom: 1px solid #cbd5e1;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            <div class="header-bar"></div>
            
            <div class="flex-between">
              <div>
                <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #0f172a;">${invoice.tenant?.name || 'YQ Management'}</h1>
                <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">Tax Invoice & Official Receipt</p>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 18px; font-weight: 700; color: #0f172a;">TAX INVOICE</div>
                <div style="font-size: 13px; font-weight: 600; color: #2563eb; margin-top: 2px;">${invoice.invoiceNumber}</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Date: ${dateStr}</div>
                <div style="display: inline-block; margin-top: 6px; padding: 2px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; ${
                  invoice.status === 'PAID' ? 'background: #dcfce7; color: #15803d;' : 'background: #fef3c7; color: #b45309;'
                }">
                  ${invoice.status}
                </div>
              </div>
            </div>

            <div style="margin-top: 32px; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">Billed To:</div>
              <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 4px;">${invoice.customer?.name || 'Customer'}</div>
              ${invoice.customer?.phone ? `<div style="font-size: 13px; color: #475569; margin-top: 2px;">${invoice.customer.phone}</div>` : ''}
              ${invoice.customer?.email ? `<div style="font-size: 13px; color: #475569; margin-top: 2px;">${invoice.customer.email}</div>` : ''}
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 30px;">#</th>
                  <th>Item / Service</th>
                  <th style="text-align: center; width: 60px;">Qty</th>
                  <th style="text-align: right; width: 120px;">Unit Price</th>
                  <th style="text-align: right; width: 120px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>

            <div style="display: flex; justify-content: flex-end; margin-top: 24px;">
              <div style="width: 280px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; color: #64748b;">
                  <span>Subtotal</span>
                  <span style="font-weight: 500; color: #1e293b;">${formatMoney(invoice.subtotal, currency)}</span>
                </div>
                ${taxRows}
                <div style="display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 2px solid #cbd5e1; font-size: 16px; font-weight: 700; color: #0f172a;">
                  <span>Total</span>
                  <span style="color: #2563eb;">${formatMoney(invoice.total, currency)}</span>
                </div>
              </div>
            </div>

            <div style="margin-top: 60px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between;">
              <span>Thank you for your business! This is a computer-generated tax invoice.</span>
              <span>${invoice.tenant?.name || 'YQ Management'}</span>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 250);

    return true;
  } catch (err) {
    console.error('Failed to print invoice:', err);
    return false;
  }
}
