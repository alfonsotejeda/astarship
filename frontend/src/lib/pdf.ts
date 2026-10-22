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

export function exportPdf({ title, filter, columns, rows }: PdfTable) {
  const doc = new jsPDF({ orientation: columns.length > 5 ? "landscape" : "portrait" });

  doc.setFontSize(16);
  doc.text(title, 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(filter ? `Filtro: ${filter}` : "Sin filtros", 14, 25);
  doc.text(`Generado el ${formatDate(new Date())}`, 14, 30);

  autoTable(doc, {
    startY: 36,
    head: [columns],
    body: rows,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [11, 16, 32] },
  });

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
