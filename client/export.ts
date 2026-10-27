import { today } from './domain';
export function exportCsv(name: string, headers: string[], rows: (string | number)[][]) {
  const cell = (v: string | number) =>
    `"${String(v)
      .replace(/^[=+@\-\t\r]/, "'$&")
      .replaceAll('"', '""')}"`;
  const csv = '\uFEFF' + [headers, ...rows].map((row) => row.map(cell).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `rentaautos-${name}-${today()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
