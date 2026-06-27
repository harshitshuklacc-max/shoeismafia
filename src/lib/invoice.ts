import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { PosSaleItem } from "@/types";

interface InvoiceData {
  invoiceNumber: string;
  type: "pos" | "online";
  items: PosSaleItem[] | { product_name: string; quantity: number; unit_price: number; total_price: number }[];
  subtotal: number;
  discount?: number;
  total: number;
  paymentMethod: string;
  customerName?: string;
}

function buildInvoiceDoc(data: InvoiceData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(20);
  doc.setTextColor(40, 116, 240);
  doc.text("SHOE MAFIA", pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Premium Footwear Store", pageWidth / 2, 27, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(`Invoice: ${data.invoiceNumber}`, 14, 40);
  doc.text(`Date: ${new Date().toLocaleDateString("en-IN")}`, 14, 47);
  doc.text(`Type: ${data.type.toUpperCase()}`, 14, 54);
  doc.text(`Payment: ${data.paymentMethod}`, 14, 61);

  if (data.customerName) {
    doc.text(`Customer: ${data.customerName}`, 14, 68);
  }

  const tableData = data.items.map((item) => {
    const name = "name" in item ? item.name : item.product_name;
    return [name, item.quantity.toString(), `Rs.${item.unit_price}`, `Rs.${item.total_price}`];
  });

  autoTable(doc, {
    startY: data.customerName ? 75 : 68,
    head: [["Product", "Qty", "Price", "Total"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [40, 116, 240] },
  });

  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  doc.setFontSize(11);
  doc.text(`Subtotal: Rs.${data.subtotal.toFixed(2)}`, pageWidth - 14, finalY, { align: "right" });

  if (data.discount && data.discount > 0) {
    doc.text(`Discount: -Rs.${data.discount.toFixed(2)}`, pageWidth - 14, finalY + 7, { align: "right" });
  }

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(
    `Total: Rs.${data.total.toFixed(2)}`,
    pageWidth - 14,
    finalY + (data.discount ? 17 : 10),
    { align: "right" }
  );

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Thank you for shopping at Shoe Mafia!", pageWidth / 2, finalY + 30, { align: "center" });

  return doc;
}

export function generateInvoicePDF(data: InvoiceData) {
  const doc = buildInvoiceDoc(data);
  doc.save(`${data.invoiceNumber}.pdf`);
}

export function printInvoicePDF(data: InvoiceData) {
  const doc = buildInvoiceDoc(data);
  const blobUrl = doc.output("bloburl");
  const printWindow = window.open(blobUrl, "_blank");

  if (!printWindow) {
    doc.save(`${data.invoiceNumber}.pdf`);
    return;
  }

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}

export function printInvoice(data: InvoiceData) {
  printInvoicePDF(data);
}
