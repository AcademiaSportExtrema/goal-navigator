import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, RefreshCw, Zap } from 'lucide-react';
import type { CampoAlvo, OperadorRegra, ResponsavelCampo, RegraMes } from '@/types/database';

interface PendenciaGroup {
  produto: string | null;
  plano: string | null;
  empresa: string | null;
  count: number;
  total_valor: number;
}

const campoAlvoOptions: { value: CampoAlvo; label: string }[] = [
  { value: 'produto', label: 'Produto' },
  { value: 'plano', label: 'Plano' },
  { value: 'modalidades', label: 'Modalidades' },
  { value: 'forma_pagamento', label: 'Forma de Pagamento' },
  { value: 'condicao_pagamento', label: 'Condição de Pagamento' },
  { value: 'empresa', label: 'Empresa' },
  { value: 'situacao_contrato', label: 'Situação do Contrato' },
  { value: 'resp_venda', label: 'Resp. Venda' },
  { value: 'resp_recebimento', label: 'Resp. Recebimento' },
];

const operadorOptions: { value: OperadorRegra; label: string }[] = [
  { value: 'contem', label: 'Contém' },
  { value: 'igual', label: 'Igual a' },
  { value: 'comeca_com', label: 'Começa com' },
  { value: 'termina_com', label: 'Termina com' },
  { value: 'regex', label: 'Regex' },
];

const responsavelOptions: { value: ResponsavelCampo; label: string }[] = [
  { value: 'resp_venda', label: 'Responsável da Venda' },
  { value: 'resp_recebimento', label: 'Responsável do Recebimento' },
];

const regraMesOptions: { value: RegraMes; label: string }[] = [
  { value: 'DATA_LANCAMENTO', label: 'Data de Lançamento' },
  { value: 'DATA_INICIO', label: 'Data de Início' },
];

interface RegraForm {
  campo_alvo: CampoAlvo;
  operador: OperadorRegra;
  valor: string;
  entra_meta: boolean;
  responsavel_campo: ResponsavelCampo;
  regra_mes: RegraMes;
  observacao: string;
}

const defaultForm: RegraForm = {
  campo_alvo: 'produto',
  operador: 'contem',
  valor: '',
  entra_meta: true,
  responsavel_campo: 'resp_venda',
  regra_mes: 'DATA_LANCAMENTO',
  observacao: '',
};

export default function Pendencias() {
  const { toast } = useToast();
  const { empresaId } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<PendenciaGroup | null>(null);
  const [form, setForm] = useState<RegraForm>(defaultForm);

  const { data: pendencias, isLoading } = useQuery({
    queryKey: ['pendencias-classificacao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lancamentos')
        .select('produto, plano, empresa, valor')
        .eq('pendente_regra', true);
      
      if (error) throw error;

      const groups = new Map<string, PendenciaGroup>();
      
      for (const item of data || []) {
        const key = `${item.produto || '-'}|${item.plano || '-'}|${item.empresa || '-'}`;
        
        if (groups.has(key)) {
          const group = groups.get(key)!;
          group.count++;
          group.total_valor += Number(item.valor) || 0;
        } else {
          groups.set(key, {
            produto: item.produto,
            plano: item.plano,
            empresa: item.empresa,
            count: 1,
            total_valor: Number(item.valor) || 0,
          });
        }
      }

      return Array.from(groups.values()).sort((a, b) => b.count - a.count);
    },
  });

  const reprocessar = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('classificar-meta', {
        body: { reprocessar_todos: true },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pendencias-classificacao'] });
      queryClient.invalidateQueries({ queryKey: ['lancamentos-gerencial'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-pendentes'] });
      toast({ 
        title: 'Reprocessamento concluído!', 
        description: `${data?.processados || 0} lançamentos reclassificados.`
      });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao reprocessar', description: error.message, variant: 'destructive' });
    },
  });

  const criarRegraEReprocessar = useMutation({
    mutationFn: async ({ form, group }: { form: RegraForm; group: PendenciaGroup }) => {
      // 1. Get max priority
      const { data: regras } = await supabase
        .from('regras_meta')
        .select('prioridade')
        .order('prioridade', { ascending: false })
        .limit(1);
      
      const maxPrioridade = regras?.length ? regras[0].prioridade : 0;

      // 2. Create the rule
      const { error: insertError } = await supabase
        .from('regras_meta')
        .insert({
          ...form,
          prioridade: maxPrioridade + 1,
          empresa_id: empresaId!,
        });
      
      if (insertError) throw insertError;

      // 3. Find matching pending lancamentos
      let query = supabase
        .from('lancamentos')
        .select('id')
        .eq('pendente_regra', true);
      
      if (group.produto) query = query.eq('produto', group.produto);
      if (group.plano) query = query.eq('plano', group.plano);
      if (group.empresa) query = query.eq('empresa', group.empresa);
      // Handle nulls
      if (!group.produto) query = query.is('produto', null);
      if (!group.plano) query = query.is('plano', null);
      if (!group.empresa) query = query.is('empresa', null);

      const { data: lancamentos, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      if (!lancamentos?.length) {
        return { processados: 0 };
      }

      // 4. Reprocess only these
      const ids = lancamentos.map(l => l.id);
      const { data: result, error: classError } = await supabase.functions.invoke('classificar-meta', {
        body: { lancamento_ids: ids },
      });

      if (classError) throw classError;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pendencias-classificacao'] });
      queryClient.invalidateQueries({ queryKey: ['lancamentos-gerencial'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-pendentes'] });
      queryClient.invalidateQueries({ queryKey: ['regras-meta'] });
      toast({
        title: 'Regra criada e itens reprocessados!',
        description: `${data?.processados || 0} lançamentos reclassificados.`,
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const handleOpenDialog = (group: PendenciaGroup) => {
    setSelectedGroup(group);
    // Pre-fill form based on group
    let campo_alvo: CampoAlvo = 'plano';
    let valor = '';
    if (group.plano) {
      campo_alvo = 'plano';
      valor = group.plano;
    } else if (group.produto) {
      campo_alvo = 'produto';
      valor = group.produto;
    } else if (group.empresa) {
      campo_alvo = 'empresa';
      valor = group.empresa;
    }
    setForm({ ...defaultForm, campo_alvo, valor });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedGroup(null);
    setForm(defaultForm);
  };

  const handleSubmit = () => {
    if (!form.valor.trim()) {
      toast({ title: 'Valor é obrigatório', variant: 'destructive' });
      return;
    }
    if (!selectedGroup) return;
    criarRegraEReprocessar.mutate({ form, group: selectedGroup });
  };

  const totalPendentes = pendencias?.reduce((acc, p) => acc + p.count, 0) || 0;
  const totalValor = pendencias?.reduce((acc, p) => acc + p.total_valor, 0) || 0;

  return (
    <AppLayout title="Pendências de Classificação">
      <div className="space-y-4">
        {/* Resumo */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-4xl font-bold text-warning">{totalPendentes}</p>
                <p className="text-sm text-muted-foreground">Itens pendentes</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-4xl font-bold">
                  {new Intl.NumberFormat('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL',
                    notation: 'compact'
                  }).format(totalValor)}
                </p>
                <p className="text-sm text-muted-foreground">Valor total</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-4xl font-bold">{pendencias?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Combinações únicas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ações */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-warning" />
                  Itens sem Regra
                </CardTitle>
                <CardDescription>
                  Estes itens não correspondem a nenhuma regra configurada. Crie regras para classificá-los.
                </CardDescription>
              </div>

              <Button 
                variant="outline" 
                onClick={() => reprocessar.mutate()}
                disabled={reprocessar.isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${reprocessar.isPending ? 'animate-spin' : ''}`} />
                Reprocessar Todos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : pendencias && pendencias.length > 0 ? (
              <div className="space-y-2">
                {pendencias.map((p, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        {p.produto && (
                          <span className="px-2 py-1 bg-muted rounded text-sm">
                            <span className="text-muted-foreground mr-1">Produto:</span>
                            {p.produto}
                          </span>
                        )}
                        {p.plano && (
                          <span className="px-2 py-1 bg-muted rounded text-sm">
                            <span className="text-muted-foreground mr-1">Plano:</span>
                            {p.plano}
                          </span>
                        )}
                        {p.empresa && (
                          <span className="px-2 py-1 bg-muted rounded text-sm">
                            <span className="text-muted-foreground mr-1">Empresa:</span>
                            {p.empresa}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">{p.count} itens</p>
                        <p className="text-sm text-muted-foreground">
                          {new Intl.NumberFormat('pt-BR', { 
                            style: 'currency', 
                            currency: 'BRL' 
                          }).format(p.total_valor)}
                        </p>
                      </div>

                      <Button size="sm" onClick={() => handleOpenDialog(p)}>
                        <Zap className="h-4 w-4 mr-1" />
                        Criar e Reprocessar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-success/10 mb-4">
                  <AlertCircle className="h-8 w-8 text-success" />
                </div>
                <p className="font-medium text-lg">Tudo classificado!</p>
                <p className="text-muted-foreground">Não há itens pendentes de classificação.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Criar Regra e Reprocessar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar Regra e Reprocessar</DialogTitle>
            <DialogDescription>
              Crie uma regra e reprocesse automaticamente os {selectedGroup?.count || 0} itens pendentes deste grupo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Campo</Label>
                <Select
                  value={form.campo_alvo}
                  onValueChange={(value) => {
                    const campo = value as CampoAlvo;
                    const novoValor = selectedGroup?.[campo as keyof PendenciaGroup];
                    setForm(f => ({ ...f, campo_alvo: campo, valor: typeof novoValor === 'string' ? novoValor : '' }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {campoAlvoOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Operador</Label>
                <Select
                  value={form.operador}
                  onValueChange={(value) => setForm(f => ({ ...f, operador: value as OperadorRegra }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {operadorOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Valor para comparar</Label>
              <Input
                value={form.valor}
                onChange={(e) => setForm(f => ({ ...f, valor: e.target.value }))}
                placeholder="Ex: Academia, Plano Mensal, etc."
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <Label className="cursor-pointer">Entra na Meta?</Label>
              <Switch
                checked={form.entra_meta}
                onCheckedChange={(checked) => setForm(f => ({ ...f, entra_meta: checked }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Responsável que conta para meta</Label>
              <Select
                value={form.responsavel_campo}
                onValueChange={(value) => setForm(f => ({ ...f, responsavel_campo: value as ResponsavelCampo }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {responsavelOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data que define o mês de competência</Label>
              <Select
                value={form.regra_mes}
                onValueChange={(value) => setForm(f => ({ ...f, regra_mes: value as RegraMes }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {regraMesOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Observação (opcional)</Label>
              <Textarea
                value={form.observacao}
                onChange={(e) => setForm(f => ({ ...f, observacao: e.target.value }))}
                placeholder="Anotações sobre esta regra..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={criarRegraEReprocessar.isPending}>
              {criarRegraEReprocessar.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Criar e Reprocessar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
