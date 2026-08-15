"use client";

const measureCellWidth = (value: unknown) => {
  const text = String(value ?? "");
  return Math.min(Math.max(text.length + 2, 10), 40);
};

export async function exportToExcel(
  data: any[],
  headers: string[],
  filename: string,
  sheetName: string = "Data"
) {
  const XLSX = await import("xlsx");
  const rows = [headers, ...data];
  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  worksheet["!cols"] = headers.map((header, index) => {
    const widestCell = rows.reduce((maxWidth, row) => {
      const cellWidth = measureCellWidth(row?.[index]);
      return Math.max(maxWidth, cellWidth);
    }, measureCellWidth(header));

    return { wch: widestCell };
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    sheetName.replace(/[\\/*?:[\]]/g, " ").trim().slice(0, 31) || "Data"
  );
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
