import type { BusyImportRow } from "@/types";

interface TextItem {
  str: string;
  x: number;
  y: number;
}

interface PdfTextItem {
  str: string;
  transform: number[];
}

function isPdfTextItem(item: unknown): item is PdfTextItem {
  return (
    typeof item === "object" &&
    item !== null &&
    "str" in item &&
    typeof (item as PdfTextItem).str === "string" &&
    "transform" in item &&
    Array.isArray((item as PdfTextItem).transform)
  );
}

function getPdfTextItems(items: unknown[]): PdfTextItem[] {
  return items.filter(isPdfTextItem);
}

function toTextItem(item: PdfTextItem, roundCoords = false): TextItem {
  const x = item.transform[4];
  const y = item.transform[5];
  return {
    str: item.str.trim(),
    x: roundCoords ? Math.round(x) : x,
    y: roundCoords ? Math.round(y) : y,
  };
}

interface ParsedLine {
  cells: string[];
  raw: string;
}

interface BcnColumnBoundary {
  key: string;
  maxX: number;
}

const DEFAULT_BCN_BOUNDARIES: BcnColumnBoundary[] = [
  { key: "item_details", maxX: 43 },
  { key: "bcn", maxX: 121 },
  { key: "art_no", maxX: 191 },
  { key: "size", maxX: 245 },
  { key: "colour", maxX: 300 },
  { key: "sales_price", maxX: 384 },
  { key: "op_qty", maxX: 457 },
  { key: "qty_in", maxX: 501 },
  { key: "qty_out", maxX: 544 },
  { key: "cl_qty", maxX: Infinity },
];

function parseNumber(value: string | undefined, fallback = 0): number {
  if (!value) return fallback;
  const cleaned = value
    .replace(/PAIR/gi, "")
    .replace(/[₹Rs\s]/gi, "")
    .replace(/,/g, "");
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : fallback;
}

function parseIntValue(value: string | undefined, fallback = 0): number {
  if (!value) return fallback;
  const cleaned = value.replace(/[,\s]/g, "");
  const num = parseInt(cleaned, 10);
  return Number.isFinite(num) ? num : fallback;
}

function parseQuantity(value: string | undefined, fallback = 0): number {
  const num = parseNumber(value, fallback);
  return Math.round(num);
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const COLUMN_ALIASES: Record<string, string[]> = {
  barcode: ["barcode", "barcode no", "barcodeno", "itemcode", "item code", "code", "ean", "sku", "alias", "item alias", "bcn"],
  art_no: ["artno", "art no", "artnumber", "p1", "itemdetails", "item details"],
  size: ["size", "siz", "p2"],
  colour: ["colour", "color", "p3"],
  name: ["name", "itemname", "item name", "productname", "product name", "product", "particulars", "description"],
  product_type: ["type", "producttype", "product type", "group", "itemgroup", "item group", "parentgroup", "parent group", "category", "item category"],
  cost_price: ["costprice", "cost price", "cost", "purchaserate", "purchase rate", "purchaseprice", "cp", "pur rate", "purrate"],
  selling_price: ["sellingprice", "selling price", "saleprice", "sale price", "salesrate", "sales rate", "salesprice", "sales price", "rate", "sp", "price", "salerate"],
  mrp: ["mrp", "maxretailprice", "max retail price", "retailprice", "retail price", "listprice"],
  quantity: ["quantity", "qty", "stock", "closingstock", "closing stock", "closingqty", "closing qty", "closingbalance", "closing balance", "balance", "balanceqty", "balance qty", "stockqty", "stock qty", "onhand", "on hand", "clqty", "cl qty"],
  unit: ["unit", "uom"],
  brand: ["brand", "make", "manufacturer"],
  gst: ["gst", "gstrate", "gst rate", "tax", "taxrate", "gstpercent", "gst %"],
  hsn: ["hsn", "hsncode", "hsn code", "hsnsac", "hsn/sac", "sac"],
};

function findColumnIndex(headers: string[], field: keyof typeof COLUMN_ALIASES): number {
  const aliases = COLUMN_ALIASES[field].map(normalizeKey);
  for (let i = 0; i < headers.length; i++) {
    const h = normalizeKey(headers[i]);
    if (aliases.some((a) => h === a || h.includes(a) || a.includes(h))) {
      return i;
    }
  }
  return -1;
}

function getCell(row: ParsedLine, index: number): string {
  if (index < 0 || index >= row.cells.length) return "";
  return row.cells[index].trim();
}

export function buildBusyProductName(
  artNo: string,
  size?: string,
  colour?: string
): string {
  const base = artNo.trim();
  if (!base) return "";

  const parts = [base];
  const sizeVal = size?.trim();
  const colourVal = colour?.trim();

  if (sizeVal) parts.push(`Size ${sizeVal}`);
  if (colourVal && colourVal.toUpperCase() !== "NA") parts.push(colourVal);

  return parts.join(" - ");
}

function isBcnWiseReport(text: string): boolean {
  return /bcn\s*wise\s*stock/i.test(text);
}

function isBcnHeaderLine(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes("bcn") && lower.includes("item details") && lower.includes("cl. qty");
}

function isBcnSkipLine(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (!lower) return true;

  const skipPatterns = [
    /^shoe mafia/i,
    /^bcn wise stock/i,
    /^from \d/i,
    /^all items/i,
    /^mc\s*:/i,
    /^near /i,
    /^continued/i,
    /^page\s*\d+/i,
    /^\d+\s*of\s*\d+$/i,
    /^total/i,
    /^grand total/i,
  ];

  return skipPatterns.some((p) => p.test(lower));
}

function detectBcnBoundaries(headerItems: TextItem[]): BcnColumnBoundary[] {
  const items = headerItems.filter((i) => i.str.trim()).sort((a, b) => a.x - b.x);
  const text = items.map((i) => i.str.toLowerCase()).join(" ");
  if (!text.includes("bcn")) return DEFAULT_BCN_BOUNDARIES;

  const findX = (patterns: RegExp[], fallback: number): number => {
    for (const item of items) {
      const s = item.str.toLowerCase();
      if (patterns.some((p) => p.test(s))) return item.x;
    }
    return fallback;
  };

  const itemDetails = items[0]?.x ?? 1;
  const bcn = findX([/^bcn$/i], 86);
  const artNo = findX([/art\s*no/i, /p1/i], 156);
  const salesPrice = findX([/sales\s*price/i], 336);
  const opQty = findX([/op\.?\s*qty/i], 432);
  const qtyIn = findX([/qty\.?\s*in/i], 483);
  const qtyOut = findX([/qty\.?\s*out/i], 520);
  const clQty = findX([/cl\.?\s*qty/i], 568);

  const midpoint = (a: number, b: number) => Math.round((a + b) / 2);
  const sizeSplit = 245;

  return [
    { key: "item_details", maxX: midpoint(itemDetails, bcn) },
    { key: "bcn", maxX: midpoint(bcn, artNo) },
    { key: "art_no", maxX: midpoint(artNo, sizeSplit) },
    { key: "size", maxX: sizeSplit },
    { key: "colour", maxX: midpoint(sizeSplit + 19, salesPrice) },
    { key: "sales_price", maxX: midpoint(salesPrice, opQty) },
    { key: "op_qty", maxX: midpoint(opQty, qtyIn) },
    { key: "qty_in", maxX: midpoint(qtyIn, qtyOut) },
    { key: "qty_out", maxX: midpoint(qtyOut, clQty) },
    { key: "cl_qty", maxX: Infinity },
  ];
}

function assignBcnColumn(x: number, boundaries: BcnColumnBoundary[]): string {
  for (const col of boundaries) {
    if (x < col.maxX) return col.key;
  }
  return "cl_qty";
}

function cellsFromLineItems(
  lineItems: TextItem[],
  boundaries: BcnColumnBoundary[]
): Record<string, string> {
  const cells: Record<string, string> = {};

  for (const item of lineItems) {
    const key = assignBcnColumn(item.x, boundaries);
    cells[key] = cells[key] ? `${cells[key]} ${item.str}` : item.str;
  }

  return cells;
}

function parseBcnCells(cells: Record<string, string>): BusyImportRow | null {
  const barcode = (cells.bcn || "").replace(/\s/g, "");
  const artNo = (cells.art_no || "").trim();
  const size = (cells.size || "").trim();
  const colour = (cells.colour || "").trim();

  if (!/^\d{5,}$/.test(barcode) || !artNo) return null;

  const sellingPrice = parseNumber(cells.sales_price);
  const quantity = parseQuantity(cells.cl_qty);
  const unitMatch = (cells.sales_price || "").match(/\b(PAIR|PCS|NOS|UNIT)\b/i);
  const unit = unitMatch?.[1]?.toUpperCase() || (cells.unit || "").trim() || undefined;

  const name = buildBusyProductName(artNo, size, colour);
  if (!name) return null;

  return {
    barcode,
    name,
    art_no: artNo,
    size: size || undefined,
    colour: colour || undefined,
    unit,
    cost_price: 0,
    selling_price: sellingPrice,
    mrp: sellingPrice,
    quantity,
    brand: artNo,
    gst: 18,
    hsn: "",
  };
}

function parseBcnWiseLines(
  lines: { y: number; items: TextItem[] }[],
  boundaries: BcnColumnBoundary[]
): BusyImportRow[] {
  const seen = new Map<string, BusyImportRow>();

  for (const line of lines) {
    const raw = line.items
      .map((i) => i.str)
      .join(" ")
      .trim();
    if (isBcnSkipLine(raw) || isBcnHeaderLine(raw)) continue;

    const row = parseBcnCells(cellsFromLineItems(line.items, boundaries));
    if (!row) continue;

    const existing = seen.get(row.barcode);
    if (existing) {
      existing.quantity += row.quantity;
    } else {
      seen.set(row.barcode, row);
    }
  }

  return Array.from(seen.values());
}

function groupItemsIntoLines(items: TextItem[]): { y: number; items: TextItem[] }[] {
  const lineMap = new Map<number, TextItem[]>();

  for (const item of items) {
    if (!item.str.trim()) continue;
    const yKey = Math.round(item.y / 3) * 3;
    if (!lineMap.has(yKey)) lineMap.set(yKey, []);
    lineMap.get(yKey)!.push(item);
  }

  return [...lineMap.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([y, rowItems]) => ({
      y,
      items: rowItems.sort((a, b) => a.x - b.x),
    }));
}

async function parseBcnWisePdf(
  pdf: { numPages: number; getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: unknown[] }> }> }
): Promise<BusyImportRow[]> {
  let boundaries = DEFAULT_BCN_BOUNDARIES;
  const allLines: { y: number; items: TextItem[]; page: number }[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const items: TextItem[] = getPdfTextItems(textContent.items as unknown[])
      .map((item) => toTextItem(item, true))
      .filter((item) => item.str);

    const pageLines = groupItemsIntoLines(items);

    if (pageNum === 1) {
      const headerLine = pageLines.find((line) =>
        isBcnHeaderLine(line.items.map((i) => i.str).join(" "))
      );
      if (headerLine) {
        boundaries = detectBcnBoundaries(headerLine.items);
      }
    }

    for (const line of pageLines) {
      allLines.push({ ...line, page: pageNum });
    }
  }

  return parseBcnWiseLines(allLines, boundaries);
}

export function normalizeBusyRow(
  row: Record<string, string | number>
): BusyImportRow | null {
  const normalized: Record<string, string> = {};
  for (const [key, val] of Object.entries(row)) {
    if (val === undefined || val === null || val === "") continue;
    normalized[normalizeKey(key)] = String(val).trim();
    normalized[key.trim()] = String(val).trim();
  }

  const get = (field: keyof typeof COLUMN_ALIASES): string | undefined => {
    for (const alias of COLUMN_ALIASES[field]) {
      const nk = normalizeKey(alias);
      if (normalized[nk]) return normalized[nk];
      if (normalized[alias]) return normalized[alias];
    }
    for (const [key, val] of Object.entries(normalized)) {
      for (const alias of COLUMN_ALIASES[field]) {
        const nk = normalizeKey(alias);
        if (key.includes(nk) || nk.includes(key)) return val;
      }
    }
    return undefined;
  };

  const barcode = (get("barcode") || "").replace(/\s/g, "");
  const artNo = get("art_no");
  const size = get("size");
  const colour = get("colour");
  const nameFromArt = artNo ? buildBusyProductName(artNo, size, colour) : "";
  const name = nameFromArt || get("name");

  if (!barcode || !name) return null;
  if (barcode.length < 3) return null;

  const productType = get("product_type") || "";
  const brand = get("brand") || artNo || productType;
  const sellingPrice = parseNumber(get("selling_price"));

  return {
    barcode,
    name,
    art_no: artNo,
    size: size || undefined,
    colour: colour || undefined,
    unit: get("unit"),
    cost_price: parseNumber(get("cost_price")),
    selling_price: sellingPrice,
    mrp: parseNumber(get("mrp")) || sellingPrice,
    quantity: parseQuantity(get("quantity")),
    brand,
    product_type: productType,
    gst: parseNumber(get("gst"), 18),
    hsn: get("hsn") || "",
  };
}

export function parseBusyRows(
  rows: Record<string, string | number>[]
): BusyImportRow[] {
  const seen = new Map<string, BusyImportRow>();

  for (const row of rows) {
    const parsed = normalizeBusyRow(row);
    if (!parsed) continue;

    const existing = seen.get(parsed.barcode);
    if (existing) {
      existing.quantity += parsed.quantity;
      if (!existing.brand && parsed.brand) existing.brand = parsed.brand;
      if (!existing.product_type && parsed.product_type) existing.product_type = parsed.product_type;
    } else {
      seen.set(parsed.barcode, parsed);
    }
  }

  return Array.from(seen.values());
}

function isSkipLine(raw: string, cells: string[]): boolean {
  const lower = raw.toLowerCase().trim();
  if (!lower || lower.length < 3) return true;

  const skipPatterns = [
    /^page\s*\d+/i,
    /^\d+\s*of\s*\d+$/i,
    /^page\s*\d+\s*of\s*\d+$/i,
    /^(date|from date|to date|period|company|address|phone|email|gstin|cin|pan|fssai)/i,
    /^(total|grand total|sub total|subtotal|summary|continued)/i,
    /^(s\.?\s*no|sr\.?\s*no|serial|#)\.?$/i,
    /^[-=_*#.\s]+$/,
    /^busy/i,
    /^stock (summary|register|report|statement)/i,
    /^item (wise|list|master)/i,
    /^opening/i,
    /^closing/i,
    /^brought forward/i,
    /^carried forward/i,
  ];

  if (skipPatterns.some((p) => p.test(lower))) return true;
  if (/^page\s+\d+/i.test(lower)) return true;
  if (/^\d{1,3}$/.test(lower) && cells.length <= 2) return true;

  return false;
}

function isHeaderLine(cells: string[]): boolean {
  const joined = cells.join(" ").toLowerCase();
  if (isBcnHeaderLine(joined)) return true;
  const headerWords = ["barcode", "item", "name", "qty", "quantity", "rate", "price", "mrp", "hsn", "gst", "stock", "particulars", "code", "group", "type"];
  const matches = headerWords.filter((w) => joined.includes(w));
  return matches.length >= 2;
}

function parseLineToRow(line: ParsedLine, colMap: Record<string, number>): BusyImportRow | null {
  const get = (field: keyof typeof COLUMN_ALIASES) => getCell(line, colMap[field] ?? -1);

  let barcode = get("barcode");
  let name = get("name");

  if (!barcode) {
    const barcodeCell = line.cells.find((c) => /^[0-9A-Za-z-]{4,20}$/.test(c.replace(/\s/g, "")));
    if (barcodeCell) barcode = barcodeCell.replace(/\s/g, "");
  }

  if (!name) {
    const nameIdx = line.cells.findIndex(
      (c) => c.length > 2 && !/^\d+([.,]\d+)?$/.test(c) && !/^[0-9]{8,}$/.test(c)
    );
    if (nameIdx >= 0) name = line.cells[nameIdx];
  }

  if (!barcode || !name) return null;
  if (isSkipLine(line.raw, line.cells)) return null;

  const barcodeClean = barcode.replace(/\s/g, "");
  if (barcodeClean.length < 3) return null;
  if (/^page\d+$/i.test(barcodeClean)) return null;

  const productType = get("product_type");
  const brand = get("brand") || productType;

  let quantity = parseIntValue(get("quantity"));
  let sellingPrice = parseNumber(get("selling_price"));
  let costPrice = parseNumber(get("cost_price"));
  let mrp = parseNumber(get("mrp"));

  if (quantity === 0) {
    const intCells = line.cells
      .map((c) => parseIntValue(c))
      .filter((n, i) => n > 0 && n < 100000 && !line.cells[i].includes("."));
    if (intCells.length > 0) {
      quantity = intCells[intCells.length - 1];
    }
  }

  if (sellingPrice === 0 || costPrice === 0) {
    const priceCells = line.cells
      .map(parseNumber)
      .filter((n) => n > 0 && n < 1000000);
    if (priceCells.length >= 1 && sellingPrice === 0) sellingPrice = priceCells[0];
    if (priceCells.length >= 2 && costPrice === 0) costPrice = priceCells[1];
    if (priceCells.length >= 3 && mrp === 0) mrp = priceCells[2];
  }

  if (name.length < 2 || /^(page|total|date)/i.test(name)) return null;

  return {
    barcode: barcodeClean,
    name: name.slice(0, 200),
    cost_price: costPrice,
    selling_price: sellingPrice,
    mrp: mrp || sellingPrice,
    quantity,
    brand,
    product_type: productType,
    gst: parseNumber(get("gst"), 18),
    hsn: get("hsn"),
  };
}

function groupTextItemsIntoLines(items: TextItem[]): ParsedLine[] {
  const lineMap = new Map<number, TextItem[]>();

  for (const item of items) {
    if (!item.str.trim()) continue;
    const yKey = Math.round(item.y / 3) * 3;
    if (!lineMap.has(yKey)) lineMap.set(yKey, []);
    lineMap.get(yKey)!.push(item);
  }

  const lines: ParsedLine[] = [];
  const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);

  for (const y of sortedYs) {
    const rowItems = lineMap.get(y)!.sort((a, b) => a.x - b.x);
    const cells = rowItems.map((i) => i.str.trim()).filter(Boolean);
    const raw = cells.join(" ");
    if (cells.length === 0) continue;
    if (isSkipLine(raw, cells)) continue;
    lines.push({ cells, raw });
  }

  return lines;
}

function detectColumnMap(headerLine: ParsedLine): Record<string, number> {
  const map: Record<string, number> = {};
  for (const field of Object.keys(COLUMN_ALIASES) as (keyof typeof COLUMN_ALIASES)[]) {
    const idx = findColumnIndex(headerLine.cells, field);
    if (idx >= 0) map[field] = idx;
  }
  return map;
}

function inferColumnMapFromData(lines: ParsedLine[]): Record<string, number> {
  const map: Record<string, number> = {};

  for (const line of lines.slice(0, 20)) {
    for (let i = 0; i < line.cells.length; i++) {
      const cell = line.cells[i];
      if (/^[0-9A-Za-z-]{4,20}$/.test(cell.replace(/\s/g, "")) && !map.barcode) {
        map.barcode = i;
      }
      if (/^\d+$/.test(cell) && parseInt(cell) > 0 && parseInt(cell) < 100000 && map.quantity === undefined) {
        map.quantity = i;
      }
    }
  }

  return map;
}

export async function parseBusyPdf(file: File): Promise<BusyImportRow[]> {
  const pdfjs = await import("pdfjs-dist");

  if (typeof window !== "undefined") {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
  }

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;

  const probePage = await pdf.getPage(1);
  const probeContent = await probePage.getTextContent();
  const probeText = getPdfTextItems(probeContent.items as unknown[])
    .map((item) => item.str)
    .join(" ");

  if (isBcnWiseReport(probeText)) {
    return parseBcnWisePdf(pdf);
  }

  const allLines: ParsedLine[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const items: TextItem[] = getPdfTextItems(textContent.items as unknown[])
      .map((item) => toTextItem(item));

    const pageLines = groupTextItemsIntoLines(items);
    allLines.push(...pageLines);
  }

  let colMap: Record<string, number> = {};
  const dataLines: ParsedLine[] = [];

  for (const line of allLines) {
    if (isHeaderLine(line.cells)) {
      const detected = detectColumnMap(line);
      if (Object.keys(detected).length >= 2) {
        colMap = { ...colMap, ...detected };
      }
      continue;
    }
    dataLines.push(line);
  }

  if (Object.keys(colMap).length < 2) {
    colMap = inferColumnMapFromData(dataLines);
  }

  const seen = new Map<string, BusyImportRow>();

  for (const line of dataLines) {
    const row = parseLineToRow(line, colMap);
    if (!row) continue;

    const existing = seen.get(row.barcode);
    if (existing) {
      existing.quantity += row.quantity;
    } else {
      seen.set(row.barcode, row);
    }
  }

  return Array.from(seen.values()).filter(
    (r) => r.name.length >= 2 && !/^page\s*\d+/i.test(r.name) && r.barcode.length >= 3
  );
}

export async function parseBusyFile(file: File): Promise<BusyImportRow[]> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    return parseBusyPdf(file);
  }

  if (ext === "csv") {
    const Papa = (await import("papaparse")).default;
    return new Promise((resolve) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
        complete: (results) => {
          resolve(parseBusyRows(results.data as Record<string, string>[]));
        },
        error: () => resolve([]),
      });
    });
  }

  if (ext === "xlsx" || ext === "xls") {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet, { defval: "" });
    return parseBusyRows(rows);
  }

  return [];
}
