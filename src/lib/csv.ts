/**
 * Exporta array de objetos para CSV e dispara download no navegador.
 * Usa UTF-8 BOM para compatibilidade com Excel e separador ponto-e-vírgula.
 */
export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;

  const separator = ';';
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(separator),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h] ?? '';
        const str = String(val).replace(/"/g, '""');
        return str.includes(separator) || str.includes('"') || str.includes('\n')
          ? `"${str}"`
          : str;
      }).join(separator)
    ),
  ];

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Lê arquivo CSV e retorna array de objetos.
 * Detecta automaticamente separador (vírgula ou ponto-e-vírgula).
 */
export function parseCSV(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string).replace(/^\uFEFF/, ''); // remove BOM
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) {
          resolve([]);
          return;
        }

        // Detectar separador
        const firstLine = lines[0];
        const separator = firstLine.includes(';') ? ';' : ',';

        const headers = parseCsvLine(firstLine, separator).map(h => h.trim().toLowerCase());
        const rows = lines.slice(1).map(line => {
          const values = parseCsvLine(line, separator);
          const obj: Record<string, string> = {};
          headers.forEach((h, i) => {
            obj[h] = (values[i] || '').trim();
          });
          return obj;
        });

        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsText(file, 'UTF-8');
  });
}

/** Parse simples de linha CSV respeitando aspas */
function parseCsvLine(line: string, separator: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === separator) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}
