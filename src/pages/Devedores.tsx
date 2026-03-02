import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { PaginationControls } from '@/components/PaginationControls';
import { exportToCSV } from '@/lib/csv';
import {
  Upload as UploadIcon, FileSpreadsheet, Search, Download, Trash2, AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';

const PAGE_SIZE = 25;

export default function Devedores() {
  const { user, isAdmin, empresaId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Upload state
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

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
    if (file && (file.name.endsWith('.xls') || file.name.endsWith('.xlsx'))) {
      setSelectedFile(file);
    } else {
      toast({ title: 'Formato inválido', description: 'Selecione um arquivo .xls ou .xlsx', variant: 'destructive' });
    }
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const fileName = `${Date.now()}_${selectedFile.name}`;
      const filePath = `devedores/${empresaId}/${fileName}`;

      setUploadProgress(20);
      const { error: uploadError } = await supabase.storage.from('uploads').upload(filePath, selectedFile);
      if (uploadError) throw uploadError;

      setUploadProgress(50);

      const { data: result, error: fnError } = await supabase.functions.invoke('upload-devedores', {
        body: { arquivo_path: filePath, arquivo_nome: selectedFile.name },
      });

      setUploadProgress(100);

      if (fnError) throw fnError;

      toast({
        title: 'Upload concluído!',
        description: `${result?.resumo?.importados || 0} registros importados.`,
      });

      setSelectedFile(null);
      setPage(1);
      queryClient.invalidateQueries({ queryKey: ['devedores'] });
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
                Arraste e solte ou selecione o arquivo Excel com as parcelas vencidas.
                <br />
                <span className="text-xs text-muted-foreground">
                  O upload substitui todos os registros anteriores.
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
                  ${isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
                  ${selectedFile ? 'bg-success/5 border-success' : ''}
                `}
              >
                <input
                  type="file"
                  accept=".xls,.xlsx"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploading}
                />
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-4">
                    <FileSpreadsheet className="h-12 w-12 text-success" />
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
                      <p className="text-sm text-muted-foreground">ou clique para selecionar (.xls / .xlsx)</p>
                    </div>
                  </div>
                )}
              </div>

              {isUploading && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processando dados...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}

              {selectedFile && !isUploading && (
                <div className="mt-4 flex justify-end">
                  <Button onClick={handleUpload}>
                    <UploadIcon className="h-4 w-4 mr-2" />
                    Importar Arquivo
                  </Button>
                </div>
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
