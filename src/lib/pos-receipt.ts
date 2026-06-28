import type { PosSaleItem } from "@/types";

export interface PosReceiptData {
  invoiceNumber: string;
  items: PosSaleItem[];
  subtotal: number;
  total: number;
  paymentMethod: string;
}

function formatMoney(amount: number): string {
  return amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildReceiptHtml(data: PosReceiptData): string {
  const date = new Date().toLocaleString("en-IN");
  const rows = data.items
    .map(
      (item) => `
      <tr>
        <td class="name">${item.name}</td>
        <td class="qty">${item.quantity}</td>
        <td class="amt">${formatMoney(item.total_price)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${data.invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      line-height: 1.35;
      color: #111;
      width: 72mm;
      padding: 6mm 4mm;
    }
    .center { text-align: center; }
    .title { font-size: 16px; font-weight: 700; letter-spacing: 0.5px; }
    .sub { font-size: 10px; color: #444; margin-top: 2px; }
    .meta { margin: 10px 0; font-size: 11px; }
    .meta div { margin-bottom: 3px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { padding: 4px 0; vertical-align: top; }
    th { border-bottom: 1px dashed #999; font-size: 10px; text-transform: uppercase; }
    td.name { width: 58%; padding-right: 4px; word-break: break-word; }
    td.qty { width: 12%; text-align: center; }
    td.amt { width: 30%; text-align: right; white-space: nowrap; }
    tr.item + tr.item td { border-top: 1px dotted #ddd; }
    .totals { margin-top: 10px; border-top: 1px dashed #999; padding-top: 8px; }
    .totals div { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .grand { font-size: 14px; font-weight: 700; margin-top: 4px; }
    .thanks { margin-top: 12px; text-align: center; font-size: 10px; color: #555; }
    @media print {
      @page { margin: 4mm; size: 80mm auto; }
      body { width: auto; }
    }
  </style>
</head>
<body>
  <div class="center">
    <div class="title">SHOE MAFIA</div>
    <div class="sub">Premium Footwear Store</div>
  </div>
  <div class="meta">
    <div><strong>Bill:</strong> ${data.invoiceNumber}</div>
    <div><strong>Date:</strong> ${date}</div>
    <div><strong>Payment:</strong> ${data.paymentMethod}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th class="name">Item</th>
        <th class="qty">Qty</th>
        <th class="amt">Amt</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div><span>Subtotal</span><span>Rs. ${formatMoney(data.subtotal)}</span></div>
    <div class="grand"><span>Total</span><span>Rs. ${formatMoney(data.total)}</span></div>
  </div>
  <div class="thanks">Thank you for shopping at Shoe Mafia!</div>
  <script>
    window.onload = function() {
      window.focus();
      window.print();
    };
  <\/script>
</body>
</html>`;
}

export function printPosReceipt(data: PosReceiptData): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";

  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  if (!win) {
    iframe.remove();
    return;
  }

  win.document.open();
  win.document.write(buildReceiptHtml(data));
  win.document.close();

  const triggerPrint = () => {
    try {
      win.focus();
      win.print();
    } catch {
      // ignore print errors
    }
  };

  if (iframe.contentDocument?.readyState === "complete") {
    setTimeout(triggerPrint, 100);
  } else {
    iframe.onload = () => setTimeout(triggerPrint, 100);
  }

  setTimeout(() => iframe.remove(), 8000);
}
