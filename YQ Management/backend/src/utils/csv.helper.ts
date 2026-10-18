/**
 * Utility to convert tabular JSON objects into standard CSV text format.
 */
export function objectsToCsv(rows: Record<string, any>[]): string {
  if (!rows || rows.length === 0) return '';

  const headers = Object.keys(rows[0]);
  const escapeCell = (val: any): string => {
    if (val === null || val === undefined) return '';
    let str = '';
    if (val instanceof Date) {
      str = val.toISOString();
    } else if (typeof val === 'object') {
      try {
        str = JSON.stringify(val);
      } catch {
        str = String(val);
      }
    } else {
      str = String(val);
    }

    if (
      str.includes(',') ||
      str.includes('"') ||
      str.includes('\n') ||
      str.includes('\r')
    ) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map((h) => escapeCell(h)).join(',');
  const lines = rows.map((row) =>
    headers.map((h) => escapeCell(row[h])).join(','),
  );

  return [headerLine, ...lines].join('\r\n');
}
