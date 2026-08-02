import jsPDF from "jspdf";
import type { ActivityRow } from "./activity.functions";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number | null | undefined) {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number | null)[][]) {
  const body = [headers.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\r\n");
  download(new Blob(["\uFEFF" + body], { type: "text/csv;charset=utf-8" }), filename);
}

export function exportActivityCsv(rows: ActivityRow[], range: { from: string; to: string }) {
  downloadCsv(
    `activity-trail_${range.from}_to_${range.to}.csv`,
    ["Occurred at", "Officer", "Badge", "Department", "Action", "Category", "Summary", "Duration (ms)"],
    rows.map((r) => [
      new Date(r.occurred_at).toISOString(),
      r.actor_email,
      r.actor_badge,
      r.department,
      r.action,
      r.category,
      r.summary,
      r.duration_ms,
    ]),
  );
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function pdfHeader(doc: jsPDF, title: string, subtitle: string, accent: string) {
  const pageW = doc.internal.pageSize.getWidth();
  const [r, g, b] = hexToRgb(accent);
  doc.setFillColor(r, g, b);
  doc.rect(0, 0, pageW, 8, "F");
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 8, pageW, 64, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, 48, 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(subtitle, 48, 56);
  doc.text(new Date().toLocaleString(), pageW - 48, 56, { align: "right" });
  doc.setTextColor(20, 20, 20);
}

export function exportReportPdf(opts: {
  title: string;
  subtitle: string;
  body: string;
  accent: string;
  filename: string;
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  pdfHeader(doc, opts.title, opts.subtitle, opts.accent);

  let y = 104;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(opts.body.replace(/\*\*/g, ""), pageW - 96) as string[];
  for (const line of lines) {
    if (y > pageH - 60) {
      doc.addPage();
      y = 60;
    }
    const heading = line.startsWith("#");
    doc.setFont("helvetica", heading ? "bold" : "normal");
    doc.setFontSize(heading ? 12 : 10);
    doc.text(line.replace(/^#+\s*/, ""), 48, y);
    y += heading ? 20 : 14;
  }
  doc.save(opts.filename);
}

export function exportActivityPdf(rows: ActivityRow[], range: { from: string; to: string }, accent: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  pdfHeader(doc, "Verified Activity Trail", `${range.from} → ${range.to} · ${rows.length} entries`, accent);

  let y = 100;
  doc.setFontSize(8);
  const cols = [48, 150, 250, 360];
  const headers = ["Timestamp", "Officer", "Action", "Summary"];
  const drawHead = () => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    headers.forEach((h, i) => doc.text(h, cols[i], y));
    doc.setDrawColor(200, 200, 200);
    doc.line(48, y + 4, pageW - 48, y + 4);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 20, 20);
  };
  drawHead();

  rows.forEach((r) => {
    if (y > pageH - 50) {
      doc.addPage();
      y = 60;
      drawHead();
    }
    const summary = doc.splitTextToSize(r.summary || "—", pageW - 48 - cols[3]) as string[];
    doc.text(new Date(r.occurred_at).toLocaleString(), cols[0], y);
    doc.text((r.actor_badge || r.actor_email).slice(0, 22), cols[1], y);
    doc.text(r.action.slice(0, 24), cols[2], y);
    doc.text(summary.slice(0, 2), cols[3], y);
    y += Math.max(14, Math.min(2, summary.length) * 11);
  });

  doc.save(`activity-trail_${range.from}_to_${range.to}.pdf`);
}
