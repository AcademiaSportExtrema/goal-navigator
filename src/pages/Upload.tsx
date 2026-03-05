import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Upload as UploadIcon, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Clock, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Upload as UploadType } from '@/types/database';

export default function UploadPage() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { user, empresaId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: uploads, isLoading } = useQuery({
    queryKey: ['uploads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('uploads')
        .select('*')
        .order('criado_em', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as unknown as UploadType[];
    },
  });

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
      toast({
        title: 'Formato inválido',
        description: 'Por favor, selecione um arquivo Excel (.xls ou .xlsx)',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 1. Upload do arquivo para o Storage
      const fileName = `${Date.now()}_${selectedFile.name}`;
      const filePath = `${empresaId}/${fileName}`;

      setUploadProgress(20);

      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      setUploadProgress(50);

      // 2. Criar registro de upload
      const { data: uploadRecord, error: insertError } = await supabase
        .from('uploads')
        .insert({
          user_id: user.id,
          arquivo_path: filePath,
          arquivo_nome: selectedFile.name,
          status: 'enviado' as const,
          empresa_id: empresaId!,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setUploadProgress(70);

      // 3. Chamar Edge Function para processar
      setIsProcessing(true);
      
      const { data: processResult, error: processError } = await supabase.functions.invoke(
        'upload-importar-xls',
        {
          body: { 
            upload_id: uploadRecord.id,
            arquivo_path: filePath 
          },
        }
      );

      setUploadProgress(100);

      if (processError) {
        // Atualizar status para erro
        await supabase
          .from('uploads')
          .update({ status: 'erro', erros: [{ linha: 0, erro: processError.message }] })
          .eq('id', uploadRecord.id);
        
        throw processError;
      }

      toast({
        title: 'Upload concluído!',
        description: `${processResult?.resumo?.importados || 0} linhas importadas com sucesso.`,
      });

      // Trigger AI analysis in background
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.access_token) {
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-analista`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ upload_id: uploadRecord.id, trigger_email: true }),
          }).catch(() => {});
          toast({
            title: 'Análise IA sendo gerada...',
            description: 'O relatório estará disponível no Dashboard em instantes.',
          });
        }
      });

      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['uploads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-lancamentos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-pendentes'] });
      
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast({
        title: 'Erro no upload',
        description: error.message || 'Não foi possível processar o arquivo.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'concluido':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'erro':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'importando':
        return <Clock className="h-5 w-5 text-info animate-pulse" />;
      default:
        return <AlertCircle className="h-5 w-5 text-warning" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'concluido': return 'Concluído';
      case 'erro': return 'Erro';
      case 'importando': return 'Processando...';
      default: return 'Enviado';
    }
  };

  return (
    <AppLayout title="Upload Diário">
      <div className="space-y-6">
        {/* Área de upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UploadIcon className="h-5 w-5" />
              Importar Arquivo Excel
            </CardTitle>
            <CardDescription>
              Arraste e solte ou selecione um arquivo .xls ou .xlsx para importar os dados
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
                    <p className="text-sm text-muted-foreground">ou clique para selecionar</p>
                  </div>
                </div>
              )}
            </div>

            {isUploading && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{isProcessing ? 'Processando dados...' : 'Enviando arquivo...'}</span>
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

        {/* Histórico de uploads */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Uploads</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : uploads && uploads.length > 0 ? (
              <div className="space-y-3">
                {uploads.map((upload) => (
                  <div 
                    key={upload.id} 
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-4">
                      {getStatusIcon(upload.status)}
                      <div>
                        <p className="font-medium">{upload.arquivo_nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(upload.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {upload.status === 'concluido' && upload.resumo && (
                        <div className="text-right text-sm">
                          <p><span className="text-success font-medium">{(upload.resumo as any).importados || 0}</span> importados</p>
                          {((upload.resumo as any).duplicados || 0) > 0 && (
                            <p className="text-muted-foreground">{(upload.resumo as any).duplicados} duplicados ignorados</p>
                          )}
                          {((upload.resumo as any).pendentes_regra || 0) > 0 && (
                            <p className="text-warning">{(upload.resumo as any).pendentes_regra} pendentes de regra</p>
                          )}
                        </div>
                      )}
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        upload.status === 'concluido' ? 'bg-success/10 text-success' :
                        upload.status === 'erro' ? 'bg-destructive/10 text-destructive' :
                        upload.status === 'importando' ? 'bg-info/10 text-info' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {getStatusLabel(upload.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Nenhum upload realizado ainda</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
