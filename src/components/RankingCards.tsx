import { Badge } from '@/components/ui/badge';

interface RankingItem {
  nome: string;
  vendas: string;
  percentMeta: string;
  ticketMedio: string;
  status: string;
  emoji: string;
}

function getStatusStyles(status: string) {
  if (status.includes('Excepcional')) return 'border-l-4 border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/30';
  if (status.includes('No Caminho')) return 'border-l-4 border-green-500 bg-green-50/50 dark:bg-green-950/30';
  if (status.includes('Atenção')) return 'border-l-4 border-amber-500 bg-amber-50/50 dark:bg-amber-950/30';
  return 'border-l-4 border-red-500 bg-red-50/50 dark:bg-red-950/30';
}

function getStatusBadgeClass(status: string) {
  if (status.includes('Excepcional')) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
  if (status.includes('No Caminho')) return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
  if (status.includes('Atenção')) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300';
  return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
}

export function parseRankingTable(text: string): { before: string; items: RankingItem[]; after: string } | null {
  const lines = text.split('\n');
  let tableStart = -1;
  let tableEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (tableStart === -1) tableStart = i;
      tableEnd = i;
    } else if (tableStart !== -1 && tableEnd !== -1) {
      break;
    }
  }

  if (tableStart === -1) return null;

  const tableLines = lines.slice(tableStart, tableEnd + 1);
  const dataRows = tableLines.filter(l => {
    const t = l.trim();
    return !t.match(/^\|[\s:]*-+/) && t.startsWith('|') && t.endsWith('|');
  });

  if (dataRows.length < 2) return null; // need header + at least 1 data row

  const items: RankingItem[] = dataRows.slice(1).map(row => {
    const cells = row.split('|').filter(Boolean).map(c => c.trim());
    const statusCell = cells[4] || '';
    const emojiMatch = statusCell.match(/^(🌟|✅|⚠️|🔴)\s*/);
    return {
      nome: cells[0] || '',
      vendas: cells[1] || '',
      percentMeta: cells[2] || '',
      ticketMedio: cells[3] || '',
      status: emojiMatch ? statusCell.slice(emojiMatch[0].length) : statusCell,
      emoji: emojiMatch ? emojiMatch[1] : '',
    };
  });

  if (items.length === 0) return null;

  return {
    before: lines.slice(0, tableStart).join('\n'),
    items,
    after: lines.slice(tableEnd + 1).join('\n'),
  };
}

export function RankingCards({ items }: { items: RankingItem[] }) {
  return (
    <div className="space-y-3 my-4">
      {items.map((item, i) => (
        <div key={i} className={`rounded-lg p-3 ${getStatusStyles(item.status)}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-sm">
              {item.emoji} {item.nome}
            </span>
            <Badge className={`text-xs border-0 ${getStatusBadgeClass(item.status)}`}>
              {item.status}
            </Badge>
          </div>
          <div className="text-lg font-bold">{item.vendas}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {item.percentMeta} da meta · TM {item.ticketMedio}
          </div>
        </div>
      ))}
    </div>
  );
}
