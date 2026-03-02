import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { PaginationControls } from '@/components/PaginationControls';
import { exportToCSV } from '@/lib/csv';
import {
  Upload as UploadIcon, FileSpreadsheet, Search, Download, Trash2,
  AlertTriangle, CheckCircle2, ChevronDown, XCircle, Info,
} from 'lucide-react';
import { format } from 'date-fns';

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

export default function Devedores() {
  const { user, isAdmin, empresaId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Upload state
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Resultado do processamento
  const [uploadResumo, setUploadResumo] = useState<UploadResumo | null>(null);
  const [uploadError, setUploadError] = useState<{ error: string; colunas_faltantes?: string[]; message?: string } | null>(null);
  const [avisosOpen, setAvisosOpen] = useState(false);
  const [errosOpen, setErrosOpen] = useState(false);

  // Filter & pagination
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Fetch devedores
  const { data: devedores, isLoading } = useQuery({
    queryKey: ['devedores', empresaId, search, page],
    queryFn: async () => {
      let query = supabase
        .from('devedores_parcelas')
        .select('*', { count: 'exact' })
        .order('data_vencimento', { ascending: true });

      if (search.trim()) {
        query = query.or(`nome.ilike.%${search}%,consultor.ilike.%${search}%,contrato.ilike.%${search}%`);
      }

      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data || [], total: count || 0 };
    },
    enabled: !!empresaId,
  });

  const totalPages = Math.ceil((devedores?.total || 0) / PAGE_SIZE);

  const ACCEPTED_EXTENSIONS = ['.xls', '.xlsx', '.csv'];
  const isValidFile = (name: string) => ACCEPTED_EXTENSIONS.some(ext => name.toLowerCase().endsWith(ext));

  // ── Upload handlers ─────────────────────────────────────────────
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
    } else {
      toast({ title: 'Formato inválido', description: 'Selecione um arquivo .xls, .xlsx ou .csv', variant: 'destructive' });
    }
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadResumo(null);
      setUploadError(null);
    }
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

      // Check if the response indicates a column error
      if (result?.error === 'colunas_faltantes') {
        setUploadError(result);
        toast({ title: 'Erro de estrutura', description: result.message, variant: 'destructive' });
      } else if (result?.success) {
        setUploadResumo(result.resumo);
        const avisoCount = result.resumo?.avisos?.length || 0;
        toast({
          title: 'Upload concluído!',
          description: `${result.resumo.importados} registros importados${avisoCount > 0 ? `, ${avisoCount} aviso(s)` : ''}.`,
        });
        setPage(1);
        queryClient.invalidateQueries({ queryKey: ['devedores'] });
      }

      setSelectedFile(null);
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast({ title: 'Erro no upload', description: error.message || 'Não foi possível processar o arquivo.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // ── Export CSV ───────────────────────────────────────────────────
  const handleExportCSV = async () => {
    const { data } = await supabase
      .from('devedores_parcelas')
      .select('nome, data_vencimento, valor_parcela, consultor, contrato')
      .order('data_vencimento', { ascending: true })
      .limit(5000);

    if (data && data.length > 0) {
      exportToCSV(data, 'devedores');
    }
  };

  const fmtCur = (v: number | null) => {
    if (v == null) return '-';
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const fmtDate = (d: string | null) => {
    if (!d) return '-';
    try {
      return format(new Date(d + 'T00:00:00'), 'dd/MM/yyyy');
    } catch {
      return d;
    }
  };

  return (
    <AppLayout title="Devedores">
      <div className="space-y-6">
        {/* Upload area - admin only */}
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
                  Formatos aceitos: .xls, .xlsx, .csv — O upload substitui todos os registros anteriores.
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
                  ${isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
                  ${selectedFile ? 'bg-accent/30 border-primary' : ''}
                `}
              >
                <input
                  type="file"
                  accept=".xls,.xlsx,.csv"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploading}
                />
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-4">
                    <FileSpreadsheet className="h-12 w-12 text-primary" />
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    {!isUploading && (
                      <Button onClick={() => setSelectedFile(null)} variant="outline" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
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
                  <Progress value={uploadProgress} />
                </div>
              )}

              {selectedFile && !isUploading && (
                <div className="flex justify-end">
                  <Button onClick={handleUpload}>
                    <UploadIcon className="h-4 w-4 mr-2" />
                    Importar Arquivo
                  </Button>
                </div>
              )}

              {/* Erro de colunas faltantes */}
              {uploadError?.error === 'colunas_faltantes' && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Colunas obrigatórias não encontradas</AlertTitle>
                  <AlertDescription>
                    O arquivo não possui as seguintes colunas obrigatórias:
                    <ul className="mt-2 list-disc list-inside">
                      {uploadError.colunas_faltantes?.map((col, i) => (
                        <li key={i} className="font-medium">{col}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs">Nenhum dado foi importado. Verifique o arquivo e tente novamente.</p>
                  </AlertDescription>
                </Alert>
              )}

              {/* Resumo do processamento */}
              {uploadResumo && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-sm">Resumo do Processamento</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div className="bg-background rounded-md p-3 text-center">
                        <p className="text-muted-foreground text-xs">Linhas lidas</p>
                        <p className="text-lg font-bold">{uploadResumo.total_linhas}</p>
                      </div>
                      <div className="bg-background rounded-md p-3 text-center">
                        <p className="text-muted-foreground text-xs">Importados</p>
                        <p className="text-lg font-bold text-primary">{uploadResumo.importados}</p>
                      </div>
                      <div className="bg-background rounded-md p-3 text-center">
                        <p className="text-muted-foreground text-xs">Avisos</p>
                        <p className={`text-lg font-bold ${uploadResumo.avisos.length > 0 ? 'text-yellow-600' : ''}`}>
                          {uploadResumo.avisos.length}
                        </p>
                      </div>
                      <div className="bg-background rounded-md p-3 text-center">
                        <p className="text-muted-foreground text-xs">Erros</p>
                        <p className={`text-lg font-bold ${uploadResumo.erros.length > 0 ? 'text-destructive' : ''}`}>
                          {uploadResumo.erros.length}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                      <span>📄 {uploadResumo.arquivo_nome}</span>
                      <span>👤 {uploadResumo.uploaded_by_email}</span>
                      <span>🕐 {format(new Date(uploadResumo.uploaded_at), 'dd/MM/yyyy HH:mm')}</span>
                    </div>

                    {/* Avisos colapsável */}
                    {uploadResumo.avisos.length > 0 && (
                      <Collapsible open={avisosOpen} onOpenChange={setAvisosOpen}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-full justify-between text-yellow-700 hover:text-yellow-800">
                            <span className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4" />
                              {uploadResumo.avisos.length} aviso(s)
                            </span>
                            <ChevronDown className={`h-4 w-4 transition-transform ${avisosOpen ? 'rotate-180' : ''}`} />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="max-h-48 overflow-y-auto mt-2 space-y-1">
                            {uploadResumo.avisos.map((a, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs bg-yellow-50 dark:bg-yellow-900/20 rounded p-2">
                                <Info className="h-3.5 w-3.5 mt-0.5 text-yellow-600 shrink-0" />
                                <span>
                                  <strong>Linha {a.linha}:</strong> {a.detalhe}
                                </span>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Erros colapsável */}
                    {uploadResumo.erros.length > 0 && (
                      <Collapsible open={errosOpen} onOpenChange={setErrosOpen}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-full justify-between text-destructive hover:text-destructive">
                            <span className="flex items-center gap-2">
                              <XCircle className="h-4 w-4" />
                              {uploadResumo.erros.length} erro(s)
                            </span>
                            <ChevronDown className={`h-4 w-4 transition-transform ${errosOpen ? 'rotate-180' : ''}`} />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="max-h-48 overflow-y-auto mt-2 space-y-1">
                            {uploadResumo.erros.map((e, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs bg-destructive/10 rounded p-2">
                                <XCircle className="h-3.5 w-3.5 mt-0.5 text-destructive shrink-0" />
                                <span>
                                  <strong>Linha {e.linha}:</strong> {e.erro}
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

        {/* Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle>Parcelas Vencidas</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar nome, consultor..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="pl-8 w-[220px]"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-1" />
                  CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : devedores && devedores.rows.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Data Vencimento</TableHead>
                      <TableHead className="text-right">Valor Parcela</TableHead>
                      <TableHead>Consultor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devedores.rows.map((row: any) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.nome || '-'}</TableCell>
                        <TableCell>{fmtDate(row.data_vencimento)}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmtCur(row.valor_parcela)}</TableCell>
                        <TableCell>{row.consultor || '-'}</TableCell>
                      </TableRow>
                    ))}
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

                <p className="text-xs text-muted-foreground mt-2">
                  {devedores.total} registro{devedores.total !== 1 ? 's' : ''} encontrado{devedores.total !== 1 ? 's' : ''}
                </p>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Nenhum registro de devedor encontrado</p>
                {isAdmin && <p className="text-sm mt-1">Faça upload de um arquivo para começar.</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
