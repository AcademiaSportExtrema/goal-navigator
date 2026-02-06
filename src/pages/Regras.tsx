import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Settings, Plus, Trash2, Edit, GripVertical, Play, Pause, Eye } from 'lucide-react';
import type { RegraMeta, CampoAlvo, OperadorRegra, ResponsavelCampo, RegraMes } from '@/types/database';

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
  { value: 'HIBRIDA', label: 'Híbrida (plano → início, senão → lançamento)' },
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

export default function Regras() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRegra, setEditingRegra] = useState<RegraMeta | null>(null);
  const [form, setForm] = useState<RegraForm>(defaultForm);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: regras, isLoading } = useQuery({
    queryKey: ['regras-meta'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regras_meta')
        .select('*')
        .order('prioridade', { ascending: true });
      
      if (error) throw error;
      return data as RegraMeta[];
    },
  });

  const createRegra = useMutation({
    mutationFn: async (data: RegraForm) => {
      const maxPrioridade = regras?.length ? Math.max(...regras.map(r => r.prioridade)) : 0;
      
      const { error } = await supabase
        .from('regras_meta')
        .insert({
          ...data,
          prioridade: maxPrioridade + 1,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regras-meta'] });
      toast({ title: 'Regra criada com sucesso!' });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar regra', description: error.message, variant: 'destructive' });
    },
  });

  const updateRegra = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RegraMeta> }) => {
      const { error } = await supabase
        .from('regras_meta')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regras-meta'] });
      toast({ title: 'Regra atualizada!' });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });

  const deleteRegra = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('regras_meta')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regras-meta'] });
      toast({ title: 'Regra excluída!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    },
  });

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('regras_meta')
        .update({ ativo })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regras-meta'] });
    },
  });

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRegra(null);
    setForm(defaultForm);
  };

  const handleEdit = (regra: RegraMeta) => {
    setEditingRegra(regra);
    setForm({
      campo_alvo: regra.campo_alvo,
      operador: regra.operador,
      valor: regra.valor,
      entra_meta: regra.entra_meta,
      responsavel_campo: regra.responsavel_campo,
      regra_mes: regra.regra_mes,
      observacao: regra.observacao || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.valor.trim()) {
      toast({ title: 'Valor é obrigatório', variant: 'destructive' });
      return;
    }

    if (editingRegra) {
      updateRegra.mutate({ id: editingRegra.id, data: form });
    } else {
      createRegra.mutate(form);
    }
  };

  return (
    <AppLayout title="Regras da Meta">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Motor de Regras
                </CardTitle>
                <CardDescription>
                  Configure as regras para classificar quais lançamentos entram na meta
                </CardDescription>
              </div>
              
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingRegra(null); setForm(defaultForm); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Regra
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingRegra ? 'Editar Regra' : 'Nova Regra'}</DialogTitle>
                    <DialogDescription>
                      Defina os critérios para classificação automática dos lançamentos
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Campo</Label>
                        <Select
                          value={form.campo_alvo}
                          onValueChange={(value) => setForm(f => ({ ...f, campo_alvo: value as CampoAlvo }))}
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
                    <Button onClick={handleSubmit} disabled={createRegra.isPending || updateRegra.isPending}>
                      {editingRegra ? 'Salvar Alterações' : 'Criar Regra'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : regras && regras.length > 0 ? (
              <div className="space-y-2">
                {regras.map((regra, index) => (
                  <div
                    key={regra.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border ${
                      regra.ativo ? 'bg-card' : 'bg-muted/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <GripVertical className="h-4 w-4" />
                      <span className="text-sm font-mono">#{regra.prioridade}</span>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {campoAlvoOptions.find(o => o.value === regra.campo_alvo)?.label}
                        </span>
                        <span className="text-muted-foreground">
                          {operadorOptions.find(o => o.value === regra.operador)?.label}
                        </span>
                        <code className="px-2 py-0.5 bg-muted rounded text-sm">
                          {regra.valor}
                        </code>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className={regra.entra_meta ? 'text-success' : 'text-destructive'}>
                          {regra.entra_meta ? '✓ Conta para meta' : '✗ Não conta'}
                        </span>
                        <span>→ {responsavelOptions.find(o => o.value === regra.responsavel_campo)?.label}</span>
                        <span>→ {regraMesOptions.find(o => o.value === regra.regra_mes)?.label}</span>
                      </div>
                      {regra.observacao && (
                        <p className="text-xs text-muted-foreground mt-1">{regra.observacao}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleAtivo.mutate({ id: regra.id, ativo: !regra.ativo })}
                        title={regra.ativo ? 'Desativar' : 'Ativar'}
                      >
                        {regra.ativo ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(regra)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRegra.mutate(regra.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">Nenhuma regra configurada</p>
                <p className="text-sm">Crie sua primeira regra para classificar os lançamentos automaticamente</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
