import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Download, X, ArrowUpDown, ArrowUp, ArrowDown, CalendarIcon, Columns3, Send, Trash2 } from 'lucide-react';
import { PaginationControls } from '@/components/PaginationControls';
import { format, startOfDay, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
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

// Compute resolved date range from state
function getResolvedDateRange(dateRange: string, dateFrom?: Date, dateTo?: Date) {
  if (dateRange === 'all') return { from: undefined, to: undefined };
  if (dateRange === 'custom') return { from: dateFrom, to: dateTo };
  return getDateRangeDates(dateRange);
}

// Build the Supabase query with filters applied (reusable for data + count + sum + CSV)
function applyFilters(
  query: any,
  searchTerm: string,
  filters: Record<string, string>,
  dateFrom?: Date,
  dateTo?: Date,
) {
  // Search across text columns
  if (searchTerm) {
    const s = `%${searchTerm}%`;
    query = query.or(
      `nome_cliente.ilike.${s},resp_venda.ilike.${s},resp_recebimento.ilike.${s},numero_contrato.ilike.${s},produto.ilike.${s},plano.ilike.${s},empresa.ilike.${s},matricula.ilike.${s}`
    );
  }

  // Column-specific filters
  for (const [key, value] of Object.entries(filters)) {
    if (value && value !== 'all') {
      query = query.eq(key, value);
    }
  }

  // Date range
  if (dateFrom) {
    query = query.gte('data_lancamento', format(dateFrom, 'yyyy-MM-dd'));
  }
  if (dateTo) {
    query = query.lte('data_lancamento', format(dateTo, 'yyyy-MM-dd'));
  }

  return query;
}

export default function Gerencial() {
  const { role, empresaId, consultoraId, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isConsultora = role === 'consultora';
  const isAdmin = role === 'admin' || isSuperAdmin;

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortColumn, setSortColumn] = useState<string | null>('data_lancamento');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [dateRange, setDateRange] = useState(isConsultora ? 'thisMonth' : 'all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set(defaultHiddenColumns));

  // Ajuste inline state
  const [ajusteDialogOpen, setAjusteDialogOpen] = useState(false);
  const [selectedLancamento, setSelectedLancamento] = useState<Lancamento | null>(null);
  const [justificativa, setJustificativa] = useState('');

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Lancamento | null>(null);

  const visibleColumns = useMemo(() => columns.filter(c => !hiddenColumns.has(c.key)), [hiddenColumns]);

  const toggleColumn = (key: string) => {
    setHiddenColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Debounce search
  const searchTimeout = useMemo(() => {
    let timer: ReturnType<typeof setTimeout>;
    return (value: string) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setDebouncedSearch(value);
        setCurrentPage(1);
      }, 400);
    };
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    searchTimeout(value);
  };

  // Resolved dates for queries
  const resolvedDates = useMemo(() => getResolvedDateRange(dateRange, dateFrom, dateTo), [dateRange, dateFrom, dateTo]);

  // ===== SERVER-SIDE PAGINATED QUERY =====
  const { data: queryResult, isLoading } = useQuery({
    queryKey: ['lancamentos-gerencial', currentPage, debouncedSearch, filters, sortColumn, sortDirection, resolvedDates.from?.toISOString(), resolvedDates.to?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from('lancamentos')
        .select('*', { count: 'exact' });

      query = applyFilters(query, debouncedSearch, filters, resolvedDates.from, resolvedDates.to);

      // Sorting
      const orderCol = sortColumn || 'data_lancamento';
      query = query.order(orderCol, { ascending: sortDirection === 'asc', nullsFirst: false });

      // Pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data as Lancamento[], count: count || 0 };
    },
  });

  // ===== SUM QUERY (separate, only valor) =====
  const { data: totalValor } = useQuery({
    queryKey: ['lancamentos-gerencial-sum', debouncedSearch, filters, resolvedDates.from?.toISOString(), resolvedDates.to?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from('lancamentos')
        .select('valor');

      query = applyFilters(query, debouncedSearch, filters, resolvedDates.from, resolvedDates.to);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).reduce((sum, row) => sum + (Number(row.valor) || 0), 0);
    },
  });

  // Filter options query (distinct values for dropdowns)
  const { data: filterOptions } = useQuery({
    queryKey: ['lancamentos-filter-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lancamentos')
        .select('empresa, produto, plano, resp_venda, situacao_contrato, forma_pagamento');
      if (error) throw error;
      return {
        empresa: [...new Set((data || []).map(l => l.empresa).filter(Boolean))] as string[],
        produto: [...new Set((data || []).map(l => l.produto).filter(Boolean))] as string[],
        plano: [...new Set((data || []).map(l => l.plano).filter(Boolean))] as string[],
        resp_venda: [...new Set((data || []).map(l => l.resp_venda).filter(Boolean))] as string[],
        situacao_contrato: [...new Set((data || []).map(l => l.situacao_contrato).filter(Boolean))] as string[],
        forma_pagamento: [...new Set((data || []).map(l => l.forma_pagamento).filter(Boolean))] as string[],
      };
    },
    staleTime: 60_000,
  });

  const paginatedData = queryResult?.data || [];
  const totalCount = queryResult?.count || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Get consultora info for ajuste
  const { data: consultora } = useQuery({
    queryKey: ['consultora-info-gerencial', consultoraId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consultoras')
        .select('id, nome')
        .eq('id', consultoraId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isConsultora && !!consultoraId,
  });

  // Submit ajuste mutation
  const submitAjuste = useMutation({
    mutationFn: async () => {
      if (!selectedLancamento || !consultora) throw new Error('Dados incompletos');
      const { error } = await supabase.from('solicitacoes_ajuste').insert({
        lancamento_id: selectedLancamento.id,
        consultora_id: consultora.id,
        resp_recebimento_atual: selectedLancamento.resp_recebimento || '',
        resp_recebimento_novo: consultora.nome,
        justificativa,
        empresa_id: empresaId!,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Solicitação enviada com sucesso!' });
      setAjusteDialogOpen(false);
      setSelectedLancamento(null);
      setJustificativa('');
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao enviar solicitação', description: error.message, variant: 'destructive' });
    },
  });

  // Delete lancamento mutation
  const deleteLancamento = useMutation({
    mutationFn: async (id: string) => {
      const target = paginatedData.find(l => l.id === id);
      const { error } = await supabase.from('lancamentos').delete().eq('id', id);
      if (error) throw error;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await supabase.functions.invoke('audit-log', {
          body: {
            action: 'lancamento.delete',
            target_table: 'lancamentos',
            target_id: id,
            metadata: {
              numero_contrato: target?.numero_contrato,
              nome_cliente: target?.nome_cliente,
              valor: target?.valor,
            },
          },
        });
      }
    },
    onSuccess: () => {
      toast({ title: 'Lançamento excluído com sucesso!' });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['lancamentos-gerencial'] });
      queryClient.invalidateQueries({ queryKey: ['lancamentos-gerencial-sum'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao excluir lançamento', description: error.message, variant: 'destructive' });
    },
  });

  const handleSort = (key: string) => {
    if (sortColumn === key) {
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else {
        setSortColumn(null);
        setSortDirection('desc');
      }
    } else {
      setSortColumn(key);
      setSortDirection('desc');
    }
    setCurrentPage(1);
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

  const handleExportCSV = async () => {
    // Export ALL filtered records (no pagination)
    let query = supabase.from('lancamentos').select('*');
    query = applyFilters(query, debouncedSearch, filters, resolvedDates.from, resolvedDates.to);
    if (sortColumn) {
      query = query.order(sortColumn, { ascending: sortDirection === 'asc', nullsFirst: false });
    } else {
      query = query.order('data_lancamento', { ascending: false });
    }

    const { data: allData, error } = await query;
    if (error || !allData?.length) {
      toast({ title: 'Nenhum dado para exportar', variant: 'destructive' });
      return;
    }

    const headers = columns.map(c => c.label).join(';');
    const rows = allData.map(item =>
      columns.map(c => {
        const val = item[c.key as keyof typeof item];
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
    setDebouncedSearch('');
    setDateRange(isConsultora ? 'thisMonth' : 'all');
    setDateFrom(undefined);
    setDateTo(undefined);
    setCurrentPage(1);
  };

  const activeFiltersCount = Object.values(filters).filter(v => v && v !== 'all').length + (dateRange !== (isConsultora ? 'thisMonth' : 'all') ? 1 : 0);

  const filterLabels: Record<string, string> = {
    empresa: 'Empresa',
    produto: 'Produto',
    plano: 'Plano',
    resp_venda: 'Resp. Venda',
    situacao_contrato: 'Situação',
    forma_pagamento: 'Forma Pgto.',
  };

  const formatCurrency = (value: number | null) =>
    value != null ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-';

  return (
    <AppLayout title="Análises Gerenciais">
      <div className="space-y-4">
        {/* Filtros avançados */}
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
              {Object.entries(filterOptions || {}).map(([key, options]) => (
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

              {/* Período - hidden for consultora */}
              {!isConsultora && (
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
              )}
            </div>

            {/* Date pickers for custom range - not for consultora */}
            {!isConsultora && dateRange === 'custom' && (
              <div className="flex gap-3 mt-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[180px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Data De'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); setCurrentPage(1); }} locale={ptBR} className="p-3 pointer-events-auto" />
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
                    <Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d); setCurrentPage(1); }} locale={ptBR} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Search + Export below filters */}
            <div className="flex flex-col md:flex-row gap-3 mt-4 pt-4 border-t">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, contrato, produto..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
              {!isConsultora && (
                <Button variant="outline" onClick={handleExportCSV} disabled={totalCount === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {totalCount.toLocaleString('pt-BR')} registros
                {totalValor != null && totalCount > 0 && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    · Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValor)}
                  </span>
                )}
                {isConsultora && <span className="text-xs font-normal text-muted-foreground ml-2">(mês atual)</span>}
              </CardTitle>
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
                      <div
                        key={col.key}
                        className="flex items-center gap-2 py-1 cursor-pointer text-sm hover:bg-muted/50 rounded px-1"
                        onClick={(e) => { e.preventDefault(); toggleColumn(col.key); }}
                      >
                        <Checkbox
                          checked={!hiddenColumns.has(col.key)}
                        />
                        <span>{col.label}</span>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <PaginationControls currentPage={currentPage} totalPages={totalPages} totalCount={totalCount} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
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
                    {isConsultora && <TableHead className="whitespace-nowrap">Ação</TableHead>}
                    {isAdmin && <TableHead className="whitespace-nowrap">Ações</TableHead>}
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
                        {isConsultora && <TableCell><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>}
                        {isAdmin && <TableCell><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>}
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
                        {isConsultora && (
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedLancamento(item);
                                setJustificativa('');
                                setAjusteDialogOpen(true);
                              }}
                            >
                              Solicitar Ajuste
                            </Button>
                          </TableCell>
                        )}
                        {isAdmin && (
                          <TableCell>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTarget(item)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={visibleColumns.length + (isConsultora ? 1 : 0) + (isAdmin ? 1 : 0)} className="text-center py-8 text-muted-foreground">
                        Nenhum registro encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <PaginationControls currentPage={currentPage} totalPages={totalPages} totalCount={totalCount} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
        </Card>
      </div>

      {/* Dialog de Solicitar Ajuste */}
      <Dialog open={ajusteDialogOpen} onOpenChange={setAjusteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Ajuste de Responsável</DialogTitle>
          </DialogHeader>
          {selectedLancamento && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><strong>Contrato:</strong> {selectedLancamento.numero_contrato || '-'}</div>
                <div><strong>Cliente:</strong> {selectedLancamento.nome_cliente || '-'}</div>
                <div><strong>Produto:</strong> {selectedLancamento.produto || '-'}</div>
                <div><strong>Valor:</strong> {formatCurrency(selectedLancamento.valor)}</div>
                <div className="col-span-2">
                  <strong>Resp. Recebimento atual:</strong> {selectedLancamento.resp_recebimento || '-'}
                </div>
                <div className="col-span-2">
                  <strong>Novo Resp. Recebimento:</strong> {consultora?.nome || '-'}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Justificativa *</label>
                <Textarea
                  placeholder="Explique por que este lançamento deve ser creditado a você..."
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAjusteDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => submitAjuste.mutate()}
              disabled={!justificativa.trim() || submitAjuste.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              {submitAjuste.isPending ? 'Enviando...' : 'Enviar Solicitação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteTarget && (
            <div className="grid grid-cols-2 gap-2 text-sm py-2">
              <div><strong>Contrato:</strong> {deleteTarget.numero_contrato || '-'}</div>
              <div><strong>Cliente:</strong> {deleteTarget.nome_cliente || '-'}</div>
              <div><strong>Produto:</strong> {deleteTarget.produto || '-'}</div>
              <div><strong>Valor:</strong> {formatCurrency(deleteTarget.valor)}</div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteLancamento.mutate(deleteTarget.id)}
              disabled={deleteLancamento.isPending}
            >
              {deleteLancamento.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </AppLayout>
  );
}
