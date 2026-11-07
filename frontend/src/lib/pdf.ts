import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { formatDate } from "@/lib/format";

type Cell = string | number;

interface PdfTable {
  title: string;
  filter?: string;
  columns: string[];
  rows: Cell[][];
}

interface PdfReport {
  title: string;
  filter?: string;
  tables: Omit<PdfTable, "filter">[];
}

const TABLE_STYLES = {
  styles: { fontSize: 9 },
  headStyles: { fillColor: [11, 16, 32] as [number, number, number] },
};

function newDocument(title: string, filter: string | undefined, wide: boolean) {
  const doc = new jsPDF({ orientation: wide ? "landscape" : "portrait" });

  doc.setFontSize(16);
  doc.text(title, 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(filter ? `Filtro: ${filter}` : "Sin filtros", 14, 25);
  doc.text(`Generado el ${formatDate(new Date())}`, 14, 30);

  return doc;
}

export function exportPdf({ title, filter, columns, rows }: PdfTable) {
  const doc = newDocument(title, filter, columns.length > 5);

  autoTable(doc, { startY: 36, head: [columns], body: rows, ...TABLE_STYLES });

  doc.save(`${fileName(title)}.pdf`);
}

// Every table of a report in one file, each under its own heading
export function exportReportPdf({ title, filter, tables }: PdfReport) {
  const doc = newDocument(title, filter, tables.some(table => table.columns.length > 5));
  let y = 36;

  for (const table of tables) {
    if (y > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      y = 18;
    }

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(table.title, 14, y + 4);

    autoTable(doc, {
      startY: y + 8,
      head: [table.columns],
      body: table.rows,
      ...TABLE_STYLES,
      didDrawPage: data => {
        y = (data.cursor?.y ?? y) + 10;
      },
    });
  }

  doc.save(`${fileName(title)}.pdf`);
}

function fileName(title: string) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
