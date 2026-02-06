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
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Download, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
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

export default function Gerencial() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

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

  // Valores únicos para filtros
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

  // Filtrar dados
  const filteredData = useMemo(() => {
    if (!lancamentos) return [];
    
    return lancamentos.filter(item => {
      // Busca textual
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = Object.values(item).some(val => 
          String(val).toLowerCase().includes(search)
        );
        if (!matchesSearch) return false;
      }

      // Filtros específicos
      for (const [key, value] of Object.entries(filters)) {
        if (value && value !== 'all' && item[key as keyof Lancamento] !== value) {
          return false;
        }
      }

      return true;
    });
  }, [lancamentos, searchTerm, filters]);

  // Paginação
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const formatValue = (key: string, value: any) => {
    if (value === null || value === undefined) return '-';
    
    if (key === 'valor') {
      return new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL' 
      }).format(Number(value));
    }
    
    if (key.includes('data') && value) {
      try {
        return format(new Date(value), 'dd/MM/yyyy');
      } catch {
        return value;
      }
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
  };

  const activeFiltersCount = Object.values(filters).filter(v => v && v !== 'all').length;

  return (
    <AppLayout title="Análises Gerenciais">
      <div className="space-y-4">
        {/* Barra de ações */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar em todos os campos..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant={showFilters ? 'default' : 'outline'}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                  {activeFiltersCount > 0 && (
                    <span className="ml-2 bg-primary-foreground text-primary rounded-full px-2 py-0.5 text-xs">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
                
                <Button variant="outline" onClick={handleExportCSV} disabled={!filteredData.length}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </div>

            {/* Filtros avançados */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Filtros Avançados</span>
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-1" />
                      Limpar filtros
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
                        <SelectValue placeholder={key.replace('_', ' ')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {(options as string[]).map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {filteredData.length.toLocaleString('pt-BR')} registros
              </CardTitle>
              
              {/* Paginação */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Página {currentPage} de {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
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
                    {columns.map(col => (
                      <TableHead key={col.key} className="whitespace-nowrap">
                        {col.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}>
                        {columns.map(col => (
                          <TableCell key={col.key}>
                            <div className="h-4 bg-muted rounded animate-pulse" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : paginatedData.length > 0 ? (
                    paginatedData.map((item) => (
                      <TableRow key={item.id}>
                        {columns.map(col => (
                          <TableCell key={col.key} className="whitespace-nowrap">
                            {formatValue(col.key, item[col.key as keyof Lancamento])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                        Nenhum registro encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
