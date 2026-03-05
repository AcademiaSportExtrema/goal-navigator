import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { exportToCSV } from '@/lib/csv';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Database, Download, HardDrive, ShieldAlert, Users, ScrollText } from 'lucide-react';
import { toast } from 'sonner';

const ALL_COMPANIES_VALUE = '__all__';
const EXPORTABLE_TABLES = [
  'analise_email_config',
  'analise_ia',
  'audit_logs',
  'coach_diretrizes',
  'comissao_niveis',
  'consultoras',
  'dashboard_visibilidade',
  'devedores_cobranca_historico',
  'devedores_parcelas',
  'empresas',
  'fechamento_caixa_f360',
  'lancamentos',
  'meta_anual',
  'meta_anual_meses',
  'meta_semanal',
  'metas_consultoras',
  'metas_mensais',
  'pagamentos_agregadores',
  'permissoes_perfil',
  'regras_meta',
  'solicitacoes_ajuste',
  'support_messages',
  'support_tickets',
  'system_settings',
  'uploads',
  'user_roles',
] as const;

type ExportAction = 'bundle' | 'database-all' | 'database-table' | 'users' | 'storages' | 'logs';

interface ExportFile {
  filename: string;
  rows: Record<string, unknown>[];
}

const tableLabels: Record<(typeof EXPORTABLE_TABLES)[number], string> = {
  analise_email_config: 'analise_email_config',
  analise_ia: 'analise_ia',
  audit_logs: 'audit_logs',
  coach_diretrizes: 'coach_diretrizes',
  comissao_niveis: 'comissao_niveis',
  consultoras: 'consultoras',
  dashboard_visibilidade: 'dashboard_visibilidade',
  devedores_cobranca_historico: 'devedores_cobranca_historico',
  devedores_parcelas: 'devedores_parcelas',
  empresas: 'empresas',
  fechamento_caixa_f360: 'fechamento_caixa_f360',
  lancamentos: 'lancamentos',
  meta_anual: 'meta_anual',
  meta_anual_meses: 'meta_anual_meses',
  meta_semanal: 'meta_semanal',
  metas_consultoras: 'metas_consultoras',
  metas_mensais: 'metas_mensais',
  pagamentos_agregadores: 'pagamentos_agregadores',
  permissoes_perfil: 'permissoes_perfil',
  regras_meta: 'regras_meta',
  solicitacoes_ajuste: 'solicitacoes_ajuste',
  support_messages: 'support_messages',
  support_tickets: 'support_tickets',
  system_settings: 'system_settings',
  uploads: 'uploads',
  user_roles: 'user_roles',
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function Exportacoes() {
  const { empresaId, empresaNome, isSuperAdmin } = useAuth();
  const [selectedTable, setSelectedTable] = useState<(typeof EXPORTABLE_TABLES)[number]>('lancamentos');
  const [empresaFilter, setEmpresaFilter] = useState(ALL_COMPANIES_VALUE);

  const { data: empresas } = useQuery({
    queryKey: ['exportacoes-empresas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('empresas').select('id, nome').order('nome');
      if (error) throw error;
      return data;
    },
    enabled: isSuperAdmin,
  });

  const exportMutation = useMutation({
    mutationFn: async ({ action, table }: { action: ExportAction; table?: string }) => {
      const scopedEmpresaId = isSuperAdmin
        ? empresaFilter !== ALL_COMPANIES_VALUE
          ? empresaFilter
          : null
        : empresaId;

      const { data, error } = await supabase.functions.invoke('export-cloud-data', {
        body: {
          action,
          table,
          empresa_id: scopedEmpresaId,
        },
      });

      if (error) throw error;

      const files = ((data?.files as ExportFile[] | undefined) || []).filter((file) => file.rows.length > 0);
      if (files.length === 0) {
        throw new Error('Nenhum dado encontrado para exportação neste escopo.');
      }

      for (const file of files) {
        exportToCSV(file.rows, file.filename);
        await wait(140);
      }

      return { total: files.length };
    },
    onSuccess: ({ total }) => {
      toast.success(`${total} arquivo(s) CSV gerado(s).`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao exportar dados.');
    },
  });

  const currentScopeLabel = isSuperAdmin
    ? empresaFilter === ALL_COMPANIES_VALUE
      ? 'Todas as empresas'
      : empresas?.find((empresa) => empresa.id === empresaFilter)?.nome || 'Empresa filtrada'
    : empresaNome || 'Minha empresa';

  return (
    <AppLayout title="Exportações CSV">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Exportações CSV</h1>
            <p className="text-sm text-muted-foreground">
              Exporte dados do banco, usuários, metadados de storage e logs do app no escopo permitido.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Escopo: {currentScopeLabel}</Badge>
            <Button
              onClick={() => exportMutation.mutate({ action: 'bundle' })}
              disabled={exportMutation.isPending}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar pacote completo
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4" />
              Limites desta central
            </CardTitle>
            <CardDescription>
              Secrets, Edge Functions e logs internos da plataforma não ficam expostos ao app por segurança.
            </CardDescription>
          </CardHeader>
          {isSuperAdmin && (
            <CardContent>
              <div className="flex flex-col gap-2 md:max-w-sm">
                <span className="text-sm font-medium text-foreground">Filtrar por empresa</span>
                <Select value={empresaFilter} onValueChange={setEmpresaFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o escopo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_COMPANIES_VALUE}>Todas as empresas</SelectItem>
                    {empresas?.map((empresa) => (
                      <SelectItem key={empresa.id} value={empresa.id}>
                        {empresa.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          )}
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-4 w-4" />
                Database
              </CardTitle>
              <CardDescription>
                Exporta todas as colunas das tabelas públicas disponíveis neste escopo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <span className="text-sm font-medium text-foreground">Tabela específica</span>
                <Select value={selectedTable} onValueChange={(value) => setSelectedTable(value as (typeof EXPORTABLE_TABLES)[number])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma tabela" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPORTABLE_TABLES.map((table) => (
                      <SelectItem key={table} value={table}>
                        {tableLabels[table]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-3 md:flex-row">
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={exportMutation.isPending}
                  onClick={() => exportMutation.mutate({ action: 'database-table', table: selectedTable })}
                >
                  <Download className="h-4 w-4" />
                  Exportar tabela
                </Button>
                <Button
                  className="gap-2"
                  disabled={exportMutation.isPending}
                  onClick={() => exportMutation.mutate({ action: 'database-all' })}
                >
                  <Download className="h-4 w-4" />
                  Exportar todas as tabelas
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Users
              </CardTitle>
              <CardDescription>
                Exporta usuários de autenticação com roles, empresa e último acesso.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="gap-2"
                disabled={exportMutation.isPending}
                onClick={() => exportMutation.mutate({ action: 'users' })}
              >
                <Download className="h-4 w-4" />
                Exportar usuários
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <HardDrive className="h-4 w-4" />
                Storages
              </CardTitle>
              <CardDescription>
                Exporta metadados dos arquivos usados pelo app nos buckets uploads e logos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="gap-2"
                disabled={exportMutation.isPending}
                onClick={() => exportMutation.mutate({ action: 'storages' })}
              >
                <Download className="h-4 w-4" />
                Exportar storages
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ScrollText className="h-4 w-4" />
                Logs do app
              </CardTitle>
              <CardDescription>
                Exporta o histórico de auditoria salvo em audit_logs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="gap-2"
                disabled={exportMutation.isPending}
                onClick={() => exportMutation.mutate({ action: 'logs' })}
              >
                <Download className="h-4 w-4" />
                Exportar logs
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
