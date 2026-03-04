import { useMemo, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  FileSpreadsheet,
  Info,
  Loader2,
  MessageSquareText,
  Search,
  Trash2,
  Upload as UploadIcon,
  XCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { AppLayout } from '@/components/layout/AppLayout';
import { CobrancaStatusBadge, getCobrancaStatusLabel } from '@/components/CobrancaStatusBadge';
import { PaginationControls } from '@/components/PaginationControls';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { exportToCSV } from '@/lib/csv';

type DevedorParcela = Tables<'devedores_parcelas'>;
type CobrancaStatus = 'pendente' | 'em_contato' | 'pago';
type CobrancaEventoTipo = 'tentativa_contato' | 'pagamento_confirmado';

type HistoricoCobranca = {
  id: string;
  chave_cobranca: string;
  contato_em: string;
  created_at: string;
  created_by: string;
  created_by_label: string;
  devedor_parcela_id: string | null;
  empresa_id: string;
  observacao: string | null;
  tipo: CobrancaEventoTipo;
};

const PAGE_SIZE = 25;

interface Aviso {
  linha: number;
  tipo: string;
  detalhe: string;
}

interface Erro {
  linha: number;
  erro: string;
}

interface UploadResumo {
  total_linhas: number;
  importados: number;
  avisos: Aviso[];
  erros: Erro[];
  arquivo_nome: string | null;
  uploaded_at: string;
  uploaded_by_email: string | null;
}

function formatCurrency(value: number | null) {
  if (value == null) return '-';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value: string | null) {
  if (!value) return '-';
  try {
    return format(new Date(`${value}T00:00:00`), 'dd/MM/yyyy');
  } catch {
    return value;
  }
}

function formatDateTime(value: string | null) {
  if (!value) return '-';
  try {
    return format(new Date(value), 'dd/MM/yyyy HH:mm');
  } catch {
    return value;
  }
}

function toDateTimeLocalValue(value: string | null) {
  if (!value) return format(new Date(), "yyyy-MM-dd'T'HH:mm");
  try {
    return format(new Date(value), "yyyy-MM-dd'T'HH:mm");
  } catch {
    return format(new Date(), "yyyy-MM-dd'T'HH:mm");
  }
}

function getEventoLabel(tipo: CobrancaEventoTipo) {
  return tipo === 'pagamento_confirmado' ? 'Pagamento confirmado' : 'Tentativa de contato';
}

export default function Devedores() {
  const { user, isAdmin, empresaId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResumo, setUploadResumo] = useState<UploadResumo | null>(null);
  const [uploadError, setUploadError] = useState<{ error: string; colunas_faltantes?: string[]; message?: string } | null>(null);
  const [avisosOpen, setAvisosOpen] = useState(false);
  const [errosOpen, setErrosOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filterConsultor, setFilterConsultor] = useState<string>('__all__');
  const [filterCobranca, setFilterCobranca] = useState<string>('__all__');
  const [sortField, setSortField] = useState<string>('data_vencimento');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [formState, setFormState] = useState<Record<string, { contatoEm: string; observacao: string }>>({});
  const [savingAction, setSavingAction] = useState<{ rowId: string; tipo: CobrancaEventoTipo } | null>(null);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-40" />;
    return sortDir === 'asc'
      ? <ArrowUp className="ml-1 h-3.5 w-3.5" />
      : <ArrowDown className="ml-1 h-3.5 w-3.5" />;
  };

  const { data: consultoresList } = useQuery({
    queryKey: ['devedores-consultores', empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('devedores_parcelas')
        .select('consultor')
        .not('consultor', 'is', null)
        .order('consultor');

      if (error) throw error;

      const seen = new Map<string, string>();
      for (const consultor of (data || []).map(item => item.consultor).filter(Boolean) as string[]) {
        const key = consultor.toLowerCase();
        if (!seen.has(key)) seen.set(key, consultor);
      }

      return [...seen.values()];
    },
  });

  const { data: devedores, isLoading } = useQuery({
    queryKey: ['devedores', empresaId, search, page, filterConsultor, filterCobranca, sortField, sortDir],
    enabled: !!empresaId,
    queryFn: async () => {
      let query = supabase
        .from('devedores_parcelas')
        .select('*', { count: 'exact' })
        .order(sortField, { ascending: sortDir === 'asc' });

      if (search.trim()) {
        query = query.or(`nome.ilike.%${search}%,consultor.ilike.%${search}%,contrato.ilike.%${search}%`);
      }

      if (filterConsultor !== '__all__') {
        query = query.ilike('consultor', filterConsultor);
      }

      if (filterCobranca !== '__all__') {
        query = query.eq('status_cobranca', filterCobranca as CobrancaStatus);
      }

      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      return { rows: (data || []) as DevedorParcela[], total: count || 0 };
    },
  });

  const pageRows = devedores?.rows ?? [];
  const totalPages = Math.ceil((devedores?.total || 0) / PAGE_SIZE);

  const chavesPagina = useMemo(
    () => [...new Set(pageRows.map(row => row.chave_cobranca).filter(Boolean))] as string[],
    [pageRows],
  );

  const { data: historicoPorChave } = useQuery({
    queryKey: ['devedores-historico', chavesPagina],
    enabled: chavesPagina.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('devedores_cobranca_historico')
        .select('*')
        .in('chave_cobranca', chavesPagina)
        .order('contato_em', { ascending: false });

      if (error) throw error;

      return (data || []).reduce<Record<string, HistoricoCobranca[]>>((acc, item) => {
        const chave = item.chave_cobranca;
        if (!acc[chave]) acc[chave] = [];
        acc[chave].push(item as HistoricoCobranca);
        return acc;
      }, {});
    },
  });

  const ACCEPTED_EXTENSIONS = ['.xls', '.xlsx', '.csv'];
  const isValidFile = (name: string) => ACCEPTED_EXTENSIONS.some(ext => name.toLowerCase().endsWith(ext));

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file && isValidFile(file.name)) {
      setSelectedFile(file);
      setUploadResumo(null);
      setUploadError(null);
      return;
    }

    toast({
      title: 'Formato inválido',
      description: 'Selecione um arquivo .xls, .xlsx ou .csv.',
      variant: 'destructive',
    });
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setUploadResumo(null);
    setUploadError(null);
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResumo(null);
    setUploadError(null);

    try {
      const fileName = `${Date.now()}_${selectedFile.name}`;
      const filePath = `devedores/${empresaId}/${fileName}`;

      setUploadProgress(20);
      const { error: storageError } = await supabase.storage.from('uploads').upload(filePath, selectedFile);
      if (storageError) throw storageError;

      setUploadProgress(50);
      const { data: result, error: fnError } = await supabase.functions.invoke('upload-devedores', {
        body: { arquivo_path: filePath, arquivo_nome: selectedFile.name },
      });

      setUploadProgress(100);
      if (fnError) throw fnError;

      if (result?.error === 'colunas_faltantes') {
        setUploadError(result);
        toast({ title: 'Erro de estrutura', description: result.message, variant: 'destructive' });
      } else if (result?.success) {
        setUploadResumo(result.resumo);
        const avisoCount = result.resumo?.avisos?.length || 0;
        toast({
          title: 'Upload concluído',
          description: `${result.resumo.importados} registros importados${avisoCount > 0 ? ` e ${avisoCount} aviso(s)` : ''}.`,
        });
        setPage(1);
        queryClient.invalidateQueries({ queryKey: ['devedores'] });
        queryClient.invalidateQueries({ queryKey: ['devedores-historico'] });
        queryClient.invalidateQueries({ queryKey: ['devedores-consultora-visao'] });
      }

      setSelectedFile(null);
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast({
        title: 'Erro no upload',
        description: error.message || 'Não foi possível processar o arquivo.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleExportCSV = async () => {
    let query = supabase
      .from('devedores_parcelas')
      .select('nome, data_vencimento, valor_parcela, consultor, contrato, status_cobranca, ultimo_contato_em, ultima_observacao, pago_em')
      .order(sortField, { ascending: sortDir === 'asc' })
      .limit(5000);

    if (search.trim()) {
      query = query.or(`nome.ilike.%${search}%,consultor.ilike.%${search}%,contrato.ilike.%${search}%`);
    }

    if (filterConsultor !== '__all__') {
      query = query.ilike('consultor', filterConsultor);
    }

    if (filterCobranca !== '__all__') {
      query = query.eq('status_cobranca', filterCobranca as CobrancaStatus);
    }

    const { data } = await query;
    if (!data?.length) return;

    exportToCSV(
      data.map(item => ({
        ...item,
        status_cobranca: getCobrancaStatusLabel(item.status_cobranca as CobrancaStatus),
      })),
      'devedores-cobranca',
    );
  };

  const initializeRowForm = (row: DevedorParcela) => {
    setFormState(prev => {
      if (prev[row.id]) return prev;
      return {
        ...prev,
        [row.id]: {
          contatoEm: toDateTimeLocalValue(row.pago_em || row.ultimo_contato_em),
          observacao: row.ultima_observacao || '',
        },
      };
    });
  };

  const updateRowForm = (rowId: string, field: 'contatoEm' | 'observacao', value: string) => {
    setFormState(prev => ({
      ...prev,
      [rowId]: {
        contatoEm: prev[rowId]?.contatoEm || format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        observacao: prev[rowId]?.observacao || '',
        [field]: value,
      },
    }));
  };

  const handleToggleDetails = (row: DevedorParcela) => {
    if (expandedRowId === row.id) {
      setExpandedRowId(null);
      return;
    }

    initializeRowForm(row);
    setExpandedRowId(row.id);
  };

  const handleRegistrarCobranca = async (row: DevedorParcela, tipo: CobrancaEventoTipo) => {
    const form = formState[row.id] || {
      contatoEm: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      observacao: '',
    };

    if (!form.contatoEm) {
      toast({ title: 'Preencha a data do contato', variant: 'destructive' });
      return;
    }

    if (tipo === 'tentativa_contato' && !form.observacao.trim()) {
      toast({ title: 'Adicione a observação do contato', variant: 'destructive' });
      return;
    }

    setSavingAction({ rowId: row.id, tipo });

    try {
      const { data, error } = await supabase.functions.invoke('registrar-cobranca-devedor', {
        body: {
          devedorId: row.id,
          tipo,
          contatoEm: new Date(form.contatoEm).toISOString(),
          observacao: form.observacao,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: tipo === 'pagamento_confirmado' ? 'Cobrança marcada como paga' : 'Tentativa registrada',
        description: tipo === 'pagamento_confirmado'
          ? 'O status foi atualizado para pago.'
          : 'O histórico da cobrança foi atualizado.',
      });

      setFormState(prev => ({
        ...prev,
        [row.id]: {
          contatoEm: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
          observacao: '',
        },
      }));

      if (tipo === 'pagamento_confirmado') {
        setExpandedRowId(null);
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['devedores'] }),
        queryClient.invalidateQueries({ queryKey: ['devedores-historico'] }),
        queryClient.invalidateQueries({ queryKey: ['devedores-consultora-visao'] }),
      ]);
    } catch (error: any) {
      console.error('Erro ao registrar cobrança:', error);
      toast({
        title: 'Erro ao registrar cobrança',
        description: error.message || 'Não foi possível registrar a ação.',
        variant: 'destructive',
      });
    } finally {
      setSavingAction(null);
    }
  };

  return (
    <AppLayout title="Devedores">
      <div className="space-y-6">
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UploadIcon className="h-5 w-5" />
                Importar Relatório de Devedores
              </CardTitle>
              <CardDescription>
                Arraste e solte ou selecione o arquivo com as parcelas vencidas.
                <br />
                <span className="text-xs text-muted-foreground">
                  Formatos aceitos: .xls, .xlsx, .csv — o upload substitui todos os registros anteriores, mantendo o histórico por cobrança.
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                  isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                } ${selectedFile ? 'border-primary bg-accent/30' : ''}`}
              >
                <input
                  type="file"
                  accept=".xls,.xlsx,.csv"
                  onChange={handleFileSelect}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  disabled={isUploading}
                />
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-4">
                    <FileSpreadsheet className="h-12 w-12 text-primary" />
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    {!isUploading && (
                      <Button onClick={() => setSelectedFile(null)} variant="outline" size="sm">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remover
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <UploadIcon className={`h-12 w-12 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="font-medium">Arraste o arquivo aqui</p>
                      <p className="text-sm text-muted-foreground">ou clique para selecionar (.xls / .xlsx / .csv)</p>
                    </div>
                  </div>
                )}
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processando dados...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              {selectedFile && !isUploading && (
                <div className="flex justify-end">
                  <Button onClick={handleUpload}>
                    <UploadIcon className="mr-2 h-4 w-4" />
                    Importar arquivo
                  </Button>
                </div>
              )}

              {uploadError?.error === 'colunas_faltantes' && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Colunas obrigatórias não encontradas</AlertTitle>
                  <AlertDescription>
                    O arquivo não possui as seguintes colunas obrigatórias:
                    <ul className="mt-2 list-inside list-disc">
                      {uploadError.colunas_faltantes?.map((col, index) => (
                        <li key={index} className="font-medium">{col}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs">Nenhum dado foi importado. Verifique o arquivo e tente novamente.</p>
                  </AlertDescription>
                </Alert>
              )}

              {uploadResumo && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="space-y-4 pt-4">
                    <div className="mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      <span className="text-sm font-semibold">Resumo do processamento</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      <div className="rounded-md bg-background p-3 text-center">
                        <p className="text-xs text-muted-foreground">Linhas lidas</p>
                        <p className="text-lg font-bold">{uploadResumo.total_linhas}</p>
                      </div>
                      <div className="rounded-md bg-background p-3 text-center">
                        <p className="text-xs text-muted-foreground">Importados</p>
                        <p className="text-lg font-bold text-primary">{uploadResumo.importados}</p>
                      </div>
                      <div className="rounded-md bg-background p-3 text-center">
                        <p className="text-xs text-muted-foreground">Avisos</p>
                        <p className="text-lg font-bold">{uploadResumo.avisos.length}</p>
                      </div>
                      <div className="rounded-md bg-background p-3 text-center">
                        <p className="text-xs text-muted-foreground">Erros</p>
                        <p className="text-lg font-bold text-destructive">{uploadResumo.erros.length}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                      <span>📄 {uploadResumo.arquivo_nome}</span>
                      <span>👤 {uploadResumo.uploaded_by_email}</span>
                      <span>🕐 {format(new Date(uploadResumo.uploaded_at), 'dd/MM/yyyy HH:mm')}</span>
                    </div>

                    {uploadResumo.avisos.length > 0 && (
                      <Collapsible open={avisosOpen} onOpenChange={setAvisosOpen}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-full justify-between">
                            <span className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4" />
                              {uploadResumo.avisos.length} aviso(s)
                            </span>
                            <ChevronDown className={`h-4 w-4 transition-transform ${avisosOpen ? 'rotate-180' : ''}`} />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                            {uploadResumo.avisos.map((aviso, index) => (
                              <div key={index} className="flex items-start gap-2 rounded border bg-background p-2 text-xs">
                                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <span>
                                  <strong>Linha {aviso.linha}:</strong> {aviso.detalhe}
                                </span>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {uploadResumo.erros.length > 0 && (
                      <Collapsible open={errosOpen} onOpenChange={setErrosOpen}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-full justify-between">
                            <span className="flex items-center gap-2">
                              <XCircle className="h-4 w-4" />
                              {uploadResumo.erros.length} erro(s)
                            </span>
                            <ChevronDown className={`h-4 w-4 transition-transform ${errosOpen ? 'rotate-180' : ''}`} />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                            {uploadResumo.erros.map((erro, index) => (
                              <div key={index} className="flex items-start gap-2 rounded border bg-background p-2 text-xs">
                                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                                <span>
                                  <strong>Linha {erro.linha}:</strong> {erro.erro}
                                </span>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Parcelas vencidas</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar nome, consultor, contrato..."
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                      className="w-[240px] pl-8"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={handleExportCSV}>
                    <Download className="mr-1 h-4 w-4" />
                    CSV
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {isAdmin && (
                  <Select value={filterConsultor} onValueChange={(value) => { setFilterConsultor(value); setPage(1); }}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Consultor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos os consultores</SelectItem>
                      {consultoresList?.map((consultor) => (
                        <SelectItem key={consultor} value={consultor}>{consultor}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Select value={filterCobranca} onValueChange={(value) => { setFilterCobranca(value); setPage(1); }}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Status da cobrança" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos os status</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_contato">Em contato</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : pageRows.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[280px] cursor-pointer select-none" onClick={() => handleSort('nome')}>
                        <span className="flex items-center">Nome <SortIcon field="nome" /></span>
                      </TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort('data_vencimento')}>
                        <span className="flex items-center">Vencimento <SortIcon field="data_vencimento" /></span>
                      </TableHead>
                      <TableHead className="cursor-pointer select-none text-right" onClick={() => handleSort('valor_parcela')}>
                        <span className="flex items-center justify-end">Valor <SortIcon field="valor_parcela" /></span>
                      </TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort('consultor')}>
                        <span className="flex items-center">Consultor <SortIcon field="consultor" /></span>
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Último contato</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map((row) => {
                      const aberto = expandedRowId === row.id;
                      const historico = historicoPorChave?.[row.chave_cobranca || ''] || [];
                      const rowForm = formState[row.id] || {
                        contatoEm: toDateTimeLocalValue(row.pago_em || row.ultimo_contato_em),
                        observacao: row.ultima_observacao || '',
                      };
                      const isSaving = savingAction?.rowId === row.id;

                      return (
                        <>
                          <TableRow key={row.id}>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium">{row.nome || '-'}</p>
                                <p className="text-xs text-muted-foreground">Contrato: {row.contrato || '-'}</p>
                              </div>
                            </TableCell>
                            <TableCell>{formatDate(row.data_vencimento)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatCurrency(row.valor_parcela)}</TableCell>
                            <TableCell>{row.consultor || '-'}</TableCell>
                            <TableCell>
                              <CobrancaStatusBadge status={row.status_cobranca} />
                            </TableCell>
                            <TableCell>{formatDateTime(row.ultimo_contato_em)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleDetails(row)}
                                aria-expanded={aberto}
                              >
                                Detalhes
                                <ChevronDown className={`h-4 w-4 transition-transform ${aberto ? 'rotate-180' : ''}`} />
                              </Button>
                            </TableCell>
                          </TableRow>

                          {aberto && (
                            <TableRow key={`${row.id}-details`}>
                              <TableCell colSpan={7} className="bg-muted/20">
                                <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
                                  <div className="space-y-4 rounded-lg border bg-background p-4">
                                    <div className="space-y-1">
                                      <h3 className="font-semibold">Registrar cobrança</h3>
                                      <p className="text-sm text-muted-foreground">
                                        Salve a data do contato, a observação do que o cliente falou e atualize o andamento da cobrança.
                                      </p>
                                    </div>

                                    <div className="grid gap-3">
                                      <div className="grid gap-2">
                                        <label className="text-sm font-medium">Data e hora do contato</label>
                                        <Input
                                          type="datetime-local"
                                          value={rowForm.contatoEm}
                                          onChange={(e) => updateRowForm(row.id, 'contatoEm', e.target.value)}
                                        />
                                      </div>

                                      <div className="grid gap-2">
                                        <label className="text-sm font-medium">Observação</label>
                                        <Textarea
                                          placeholder="Ex.: cliente pediu retorno amanhã, informou que vai pagar na sexta..."
                                          value={rowForm.observacao}
                                          onChange={(e) => updateRowForm(row.id, 'observacao', e.target.value)}
                                        />
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                      <Button
                                        onClick={() => handleRegistrarCobranca(row, 'tentativa_contato')}
                                        disabled={isSaving || row.status_cobranca === 'pago'}
                                      >
                                        {isSaving && savingAction?.tipo === 'tentativa_contato' ? (
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                          <MessageSquareText className="mr-2 h-4 w-4" />
                                        )}
                                        Registrar tentativa
                                      </Button>
                                      <Button
                                        variant="outline"
                                        onClick={() => handleRegistrarCobranca(row, 'pagamento_confirmado')}
                                        disabled={isSaving || row.status_cobranca === 'pago'}
                                      >
                                        {isSaving && savingAction?.tipo === 'pagamento_confirmado' ? (
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                          <CheckCircle2 className="mr-2 h-4 w-4" />
                                        )}
                                        Marcar como pago
                                      </Button>
                                    </div>

                                    <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
                                      <div className="flex items-center justify-between gap-3">
                                        <span className="text-muted-foreground">Status atual</span>
                                        <CobrancaStatusBadge status={row.status_cobranca} />
                                      </div>
                                      <div className="flex items-center justify-between gap-3">
                                        <span className="text-muted-foreground">Último contato</span>
                                        <span>{formatDateTime(row.ultimo_contato_em)}</span>
                                      </div>
                                      <div className="flex items-center justify-between gap-3">
                                        <span className="text-muted-foreground">Pago em</span>
                                        <span>{formatDateTime(row.pago_em)}</span>
                                      </div>
                                      <div className="space-y-1">
                                        <span className="text-muted-foreground">Última observação</span>
                                        <p>{row.ultima_observacao || 'Nenhuma observação registrada.'}</p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-3 rounded-lg border bg-background p-4">
                                    <div className="flex items-center gap-2">
                                      <Clock3 className="h-4 w-4 text-muted-foreground" />
                                      <h3 className="font-semibold">Histórico de tentativas</h3>
                                    </div>

                                    {historico.length > 0 ? (
                                      <div className="space-y-3">
                                        {historico.map((evento) => (
                                          <div key={evento.id} className="rounded-lg border p-3">
                                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                              <div className="flex items-center gap-2">
                                                <Badge variant={evento.tipo === 'pagamento_confirmado' ? 'default' : 'secondary'}>
                                                  {getEventoLabel(evento.tipo)}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                  {formatDateTime(evento.contato_em)}
                                                </span>
                                              </div>
                                              <span className="text-xs text-muted-foreground">por {evento.created_by_label}</span>
                                            </div>
                                            <p className="text-sm">{evento.observacao || 'Sem observação informada.'}</p>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                        Nenhuma tentativa registrada para esta cobrança.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="mt-4">
                    <PaginationControls
                      currentPage={page}
                      totalPages={totalPages}
                      totalCount={devedores?.total || 0}
                      itemsPerPage={PAGE_SIZE}
                      onPageChange={setPage}
                    />
                  </div>
                )}

                <p className="mt-2 text-xs text-muted-foreground">
                  {devedores?.total || 0} registro{(devedores?.total || 0) !== 1 ? 's' : ''} encontrado{(devedores?.total || 0) !== 1 ? 's' : ''}
                </p>
              </>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <AlertTriangle className="mx-auto mb-3 h-10 w-10 opacity-50" />
                <p>Nenhum registro de devedor encontrado.</p>
                {isAdmin && <p className="mt-1 text-sm">Faça upload de um arquivo para começar.</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
