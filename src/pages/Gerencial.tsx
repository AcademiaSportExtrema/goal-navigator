import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Download, X, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, CalendarIcon, Columns3 } from 'lucide-react';
import { format, startOfDay, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Lancamento } from '@/types/database';

const ITEMS_PER_PAGE = 50;

const columns = [
  { key: 'produto', label: 'Produto' },
  { key: 'matricula', label: 'Matrícula' },
  { key: 'nome_cliente', label: 'Nome' },
  { key: 'resp_venda', label: 'Resp. Venda' },
  { key: 'resp_recebimento', label: 'Resp. Receb.' },
  { key: 'data_cadastro', label: 'Dt. Cadastro' },
  { key: 'numero_contrato', label: 'Contrato' },
  { key: 'data_inicio', label: 'Dt. Início' },
  { key: 'data_termino', label: 'Dt. Término' },
  { key: 'duracao', label: 'Duração' },
  { key: 'modalidades', label: 'Modalidades' },
  { key: 'turmas', label: 'Turmas' },
  { key: 'categoria', label: 'Categoria' },
  { key: 'plano', label: 'Plano' },
  { key: 'situacao_contrato', label: 'Situação' },
  { key: 'data_lancamento', label: 'Dt. Lanç.' },
  { key: 'forma_pagamento', label: 'Forma Pgto.' },
  { key: 'condicao_pagamento', label: 'Cond. Pgto.' },
  { key: 'valor', label: 'Valor' },
  { key: 'empresa', label: 'Empresa' },
];

const defaultHiddenColumns = new Set([
  'resp_venda', 'data_cadastro', 'numero_contrato', 'data_termino',
  'duracao', 'modalidades', 'turmas', 'categoria',
  'situacao_contrato', 'forma_pagamento', 'empresa',
]);

const dateRangeOptions = [
  { value: 'all', label: 'Todos os períodos' },
  { value: 'today', label: 'Hoje' },
  { value: '7days', label: 'Últimos 7 dias' },
  { value: '30days', label: 'Últimos 30 dias' },
  { value: 'thisMonth', label: 'Este mês' },
  { value: 'lastMonth', label: 'Mês passado' },
  { value: 'custom', label: 'Personalizado' },
];

function getDateRangeDates(range: string): { from?: Date; to?: Date } {
  const today = startOfDay(new Date());
  switch (range) {
    case 'today':
      return { from: today, to: new Date() };
    case '7days':
      return { from: subDays(today, 7), to: new Date() };
    case '30days':
      return { from: subDays(today, 30), to: new Date() };
    case 'thisMonth':
      return { from: startOfMonth(today), to: endOfMonth(today) };
    case 'lastMonth': {
      const lastMonth = subMonths(today, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    }
    default:
      return {};
  }
}

export default function Gerencial() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [dateRange, setDateRange] = useState('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set(defaultHiddenColumns));

  const visibleColumns = useMemo(() => columns.filter(c => !hiddenColumns.has(c.key)), [hiddenColumns]);

  const toggleColumn = (key: string) => {
    setHiddenColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const { data: lancamentos, isLoading } = useQuery({
    queryKey: ['lancamentos-gerencial'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lancamentos')
        .select('*')
        .order('data_lancamento', { ascending: false })
        .limit(1000);
      
      if (error) throw error;
      return data as Lancamento[];
    },
  });

  const filterOptions = useMemo(() => {
    if (!lancamentos) return {};
    return {
      empresa: [...new Set(lancamentos.map(l => l.empresa).filter(Boolean))],
      produto: [...new Set(lancamentos.map(l => l.produto).filter(Boolean))],
      plano: [...new Set(lancamentos.map(l => l.plano).filter(Boolean))],
      resp_venda: [...new Set(lancamentos.map(l => l.resp_venda).filter(Boolean))],
      situacao_contrato: [...new Set(lancamentos.map(l => l.situacao_contrato).filter(Boolean))],
      forma_pagamento: [...new Set(lancamentos.map(l => l.forma_pagamento).filter(Boolean))],
    };
  }, [lancamentos]);

  const filteredData = useMemo(() => {
    if (!lancamentos) return [];
    
    return lancamentos.filter(item => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = Object.values(item).some(val => 
          String(val).toLowerCase().includes(search)
        );
        if (!matchesSearch) return false;
      }

      for (const [key, value] of Object.entries(filters)) {
        if (value && value !== 'all' && item[key as keyof Lancamento] !== value) {
          return false;
        }
      }

      // Date range filter
      if (dateRange !== 'all' && item.data_lancamento) {
        const itemDate = new Date(item.data_lancamento);
        let from: Date | undefined;
        let to: Date | undefined;

        if (dateRange === 'custom') {
          from = dateFrom;
          to = dateTo;
        } else {
          const range = getDateRangeDates(dateRange);
          from = range.from;
          to = range.to;
        }

        if (from && itemDate < from) return false;
        if (to && itemDate > to) return false;
      }

      return true;
    });
  }, [lancamentos, searchTerm, filters, dateRange, dateFrom, dateTo]);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortColumn as keyof Lancamento];
      const bVal = b[sortColumn as keyof Lancamento];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      
      let cmp: number;
      if (sortColumn === 'valor') {
        cmp = Number(aVal) - Number(bVal);
      } else {
        cmp = String(aVal).localeCompare(String(bVal), 'pt-BR');
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Totals
  const totals = useMemo(() => {
    const totalValor = filteredData.reduce((sum, item) => sum + (Number(item.valor) || 0), 0);
    return { valor: totalValor, count: filteredData.length };
  }, [filteredData]);

  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSort = (key: string) => {
    if (sortColumn === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(key);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortColumn !== columnKey) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    if (sortDirection === 'asc') return <ArrowUp className="h-3 w-3 ml-1" />;
    return <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const formatValue = (key: string, value: any) => {
    if (value === null || value === undefined) return '-';
    if (key === 'valor') {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
    }
    if (key.includes('data') && value) {
      try { return format(new Date(value), 'dd/MM/yyyy'); } catch { return value; }
    }
    return String(value);
  };

  const handleExportCSV = () => {
    if (!filteredData.length) return;
    const headers = columns.map(c => c.label).join(';');
    const rows = filteredData.map(item => 
      columns.map(c => {
        const val = item[c.key as keyof Lancamento];
        return val === null ? '' : String(val).replace(/;/g, ',');
      }).join(';')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gerencial_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setDateRange('all');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const activeFiltersCount = Object.values(filters).filter(v => v && v !== 'all').length + (dateRange !== 'all' ? 1 : 0);

  const filterLabels: Record<string, string> = {
    empresa: 'Empresa',
    produto: 'Produto',
    plano: 'Plano',
    resp_venda: 'Resp. Venda',
    situacao_contrato: 'Situação',
    forma_pagamento: 'Forma Pgto.',
  };

  return (
    <AppLayout title="Análises Gerenciais">
      <div className="space-y-4">
        {/* Filtros avançados - sempre visíveis */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Filtros Avançados</span>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Limpar filtros ({activeFiltersCount})
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(filterOptions).map(([key, options]) => (
                <Select
                  key={key}
                  value={filters[key] || 'all'}
                  onValueChange={(value) => {
                    setFilters(prev => ({ ...prev, [key]: value }));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={filterLabels[key] || key} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{filterLabels[key] || key} - Todos</SelectItem>
                    {(options as string[]).map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}

              {/* Período */}
              <Select value={dateRange} onValueChange={(v) => { setDateRange(v); setCurrentPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  {dateRangeOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date pickers for custom range */}
            {dateRange === 'custom' && (
              <div className="flex gap-3 mt-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[180px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Data De'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} locale={ptBR} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[180px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Data Até'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={ptBR} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Search + Export below filters */}
            <div className="flex flex-col md:flex-row gap-3 mt-4 pt-4 border-t">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar em todos os campos..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={handleExportCSV} disabled={!filteredData.length}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {filteredData.length.toLocaleString('pt-BR')} registros
              </CardTitle>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Columns3 className="h-4 w-4 mr-1" />
                      Colunas
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 max-h-80 overflow-y-auto" align="end">
                    <div className="space-y-1">
                      <p className="text-sm font-medium mb-2">Colunas visíveis</p>
                      {columns.map(col => (
                        <label key={col.key} className="flex items-center gap-2 py-1 cursor-pointer text-sm hover:bg-muted/50 rounded px-1">
                          <Checkbox
                            checked={!hiddenColumns.has(col.key)}
                            onCheckedChange={() => toggleColumn(col.key)}
                          />
                          {col.label}
                        </label>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">Página {currentPage} de {totalPages || 1}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto scrollbar-thin">
              <Table className="table-dense">
                <TableHeader>
                  <TableRow>
                    {visibleColumns.map(col => (
                      <TableHead
                        key={col.key}
                        className="whitespace-nowrap cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort(col.key)}
                      >
                        <div className="flex items-center">
                          {col.label}
                          <SortIcon columnKey={col.key} />
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}>
                        {visibleColumns.map(col => (
                          <TableCell key={col.key}>
                            <div className="h-4 bg-muted rounded animate-pulse" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : paginatedData.length > 0 ? (
                    paginatedData.map((item) => (
                      <TableRow key={item.id}>
                        {visibleColumns.map(col => (
                          <TableCell key={col.key} className="whitespace-nowrap">
                            {formatValue(col.key, item[col.key as keyof Lancamento])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={visibleColumns.length} className="text-center py-8 text-muted-foreground">
                        Nenhum registro encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                {filteredData.length > 0 && (
                  <TableFooter>
                    <TableRow className="font-semibold bg-muted/30">
                      {visibleColumns.map(col => (
                        <TableCell key={col.key} className="whitespace-nowrap">
                          {col.key === 'produto' ? `TOTAIS (${totals.count})` :
                           col.key === 'valor' ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.valor) :
                           col.key === 'duracao' ? `${totals.count} itens` :
                           '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
