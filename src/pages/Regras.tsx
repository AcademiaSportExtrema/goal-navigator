import { useState, useRef, useMemo } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Settings, Plus, Trash2, Edit, GripVertical, Play, Pause, Download, Upload, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { exportToCSV, parseCSV } from '@/lib/csv';
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
];

const VALID_CAMPOS: string[] = campoAlvoOptions.map(o => o.value);
const VALID_OPERADORES: string[] = operadorOptions.map(o => o.value);
const VALID_RESPONSAVEL: string[] = responsavelOptions.map(o => o.value);
const VALID_REGRA_MES: string[] = regraMesOptions.map(o => o.value);

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

interface ParsedRegraRow {
  campo_alvo: string;
  operador: string;
  valor: string;
  entra_meta: string;
  responsavel_campo: string;
  regra_mes: string;
  observacao: string;
  errors: string[];
}

function parseEntraMeta(val: string): boolean | null {
  const v = val.toLowerCase().trim();
  if (['sim', 'true', '1', 's'].includes(v)) return true;
  if (['nao', 'não', 'false', '0', 'n'].includes(v)) return false;
  return null;
}

function validateRegraRow(row: Record<string, string>): ParsedRegraRow {
  const errors: string[] = [];
  const campo_alvo = (row.campo_alvo || '').toLowerCase().trim();
  const operador = (row.operador || '').toLowerCase().trim();
  const valor = (row.valor || '').trim();
  const entra_meta_raw = (row.entra_meta || '').trim();
  const responsavel_campo = (row.responsavel_campo || '').toLowerCase().trim();
  const regra_mes = (row.regra_mes || '').toUpperCase().trim();
  const observacao = (row.observacao || '').trim();

  if (!VALID_CAMPOS.includes(campo_alvo)) errors.push('campo_alvo inválido');
  if (!VALID_OPERADORES.includes(operador)) errors.push('operador inválido');
  if (!valor) errors.push('valor vazio');
  if (parseEntraMeta(entra_meta_raw) === null) errors.push('entra_meta inválido');
  if (!VALID_RESPONSAVEL.includes(responsavel_campo)) errors.push('responsavel_campo inválido');
  if (!VALID_REGRA_MES.includes(regra_mes)) errors.push('regra_mes inválido');

  return { campo_alvo, operador, valor, entra_meta: entra_meta_raw, responsavel_campo, regra_mes, observacao, errors };
}

export default function Regras() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRegra, setEditingRegra] = useState<RegraMeta | null>(null);
  const [form, setForm] = useState<RegraForm>(defaultForm);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRegraRow[]>([]);
  const [reprocessAfterImport, setReprocessAfterImport] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCampo, setFilterCampo] = useState('todos');
  const [sortField, setSortField] = useState<'prioridade' | 'campo_alvo' | 'valor' | 'entra_meta'>('prioridade');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const { empresaId } = useAuth();
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
          empresa_id: empresaId!,
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

  // === EXPORTAR PENDENTES ===
  const handleExportPendentes = async () => {
    try {
      const { data, error } = await supabase
        .from('lancamentos')
        .select('produto, plano, modalidades, forma_pagamento, condicao_pagamento, empresa, situacao_contrato, resp_venda, resp_recebimento, valor, data_lancamento, data_inicio, nome_cliente, numero_contrato, categoria, duracao, turmas')
        .eq('pendente_regra', true);

      if (error) throw error;
      if (!data || data.length === 0) {
        toast({ title: 'Nenhum lançamento pendente encontrado' });
        return;
      }

      exportToCSV(data, `pendentes_${new Date().toISOString().slice(0, 10)}.csv`);
      toast({ title: `${data.length} lançamentos pendentes exportados!` });
    } catch (err: any) {
      toast({ title: 'Erro ao exportar', description: err.message, variant: 'destructive' });
    }
  };

  // === IMPORTAR REGRAS ===
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await parseCSV(file);
      if (rows.length === 0) {
        toast({ title: 'Arquivo vazio ou sem dados', variant: 'destructive' });
        return;
      }

      // Verificar se tem as colunas obrigatórias
      const requiredCols = ['campo_alvo', 'operador', 'valor', 'entra_meta'];
      const missingCols = requiredCols.filter(c => !(c in rows[0]));
      if (missingCols.length > 0) {
        toast({ 
          title: 'Colunas obrigatórias ausentes', 
          description: `Faltando: ${missingCols.join(', ')}`, 
          variant: 'destructive' 
        });
        return;
      }

      const validated = rows.map(validateRegraRow);
      setParsedRows(validated);
      setImportDialogOpen(true);
    } catch (err: any) {
      toast({ title: 'Erro ao ler CSV', description: err.message, variant: 'destructive' });
    }

    // Reset input para permitir re-selecionar o mesmo arquivo
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validRows = parsedRows.filter(r => r.errors.length === 0);
  const invalidRows = parsedRows.filter(r => r.errors.length > 0);

  const regrasFiltradas = useMemo(() => {
    if (!regras) return [];
    let filtered = regras.filter(r => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        r.valor.toLowerCase().includes(searchLower) ||
        (r.observacao && r.observacao.toLowerCase().includes(searchLower)) ||
        (campoAlvoOptions.find(o => o.value === r.campo_alvo)?.label.toLowerCase().includes(searchLower));
      const matchesCampo = filterCampo === 'todos' || r.campo_alvo === filterCampo;
      return matchesSearch && matchesCampo;
    });

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'prioridade': cmp = a.prioridade - b.prioridade; break;
        case 'campo_alvo': cmp = a.campo_alvo.localeCompare(b.campo_alvo); break;
        case 'valor': cmp = a.valor.localeCompare(b.valor); break;
        case 'entra_meta': cmp = (a.entra_meta === b.entra_meta ? 0 : a.entra_meta ? -1 : 1); break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return filtered;
  }, [regras, searchTerm, filterCampo, sortField, sortDirection]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleImportConfirm = async () => {
    if (validRows.length === 0) return;
    setIsImporting(true);

    try {
      const maxPrioridade = regras?.length ? Math.max(...regras.map(r => r.prioridade)) : 0;

      const insertData = validRows.map((row, idx) => ({
        campo_alvo: row.campo_alvo as CampoAlvo,
        operador: row.operador as OperadorRegra,
        valor: row.valor,
        entra_meta: parseEntraMeta(row.entra_meta)!,
        responsavel_campo: (row.responsavel_campo || 'resp_venda') as ResponsavelCampo,
        regra_mes: (row.regra_mes || 'DATA_LANCAMENTO') as RegraMes,
        observacao: row.observacao || null,
        prioridade: maxPrioridade + idx + 1,
        empresa_id: empresaId!,
      }));

      const { error } = await supabase.from('regras_meta').insert(insertData);
      if (error) throw error;

      toast({ title: `${validRows.length} regras importadas com sucesso!` });
      queryClient.invalidateQueries({ queryKey: ['regras-meta'] });

      if (reprocessAfterImport) {
        toast({ title: 'Reprocessando pendentes...' });
        await supabase.functions.invoke('classificar-meta', {
          body: { empresa_id: empresaId },
        });
        toast({ title: 'Reprocessamento concluído!' });
        queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
      }

      setImportDialogOpen(false);
      setParsedRows([]);
    } catch (err: any) {
      toast({ title: 'Erro ao importar regras', description: err.message, variant: 'destructive' });
    } finally {
      setIsImporting(false);
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
              
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleExportPendentes}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Pendentes
                </Button>

                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar Regras
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileSelect}
                />

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
            </div>
          </CardHeader>
          <CardContent>
            {/* Barra de filtros */}
            {regras && regras.length > 0 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
                <div className="relative flex-1 w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar por valor, campo ou observação..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterCampo} onValueChange={setFilterCampo}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filtrar por campo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os campos</SelectItem>
                    {campoAlvoOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  {([
                    { field: 'prioridade' as const, label: 'Prioridade' },
                    { field: 'campo_alvo' as const, label: 'Campo' },
                    { field: 'valor' as const, label: 'Valor' },
                    { field: 'entra_meta' as const, label: 'Meta' },
                  ]).map(({ field, label }) => (
                    <Button
                      key={field}
                      variant={sortField === field ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => toggleSort(field)}
                      className="text-xs"
                    >
                      {label}
                      {sortField === field ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />
                      )}
                    </Button>
                  ))}
                </div>
                {(searchTerm || filterCampo !== 'todos') && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {regrasFiltradas.length} de {regras.length}
                  </span>
                )}
              </div>
            )}

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : regrasFiltradas.length > 0 ? (
              <div className="space-y-2">
                {regrasFiltradas.map((regra) => (
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
                <p className="font-medium">
                  {regras && regras.length > 0 ? 'Nenhuma regra encontrada com os filtros atuais' : 'Nenhuma regra configurada'}
                </p>
                <p className="text-sm">
                  {regras && regras.length > 0 
                    ? 'Tente alterar os termos de pesquisa ou filtros'
                    : 'Crie sua primeira regra para classificar os lançamentos automaticamente'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Preview da Importação */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Preview da Importação</DialogTitle>
            <DialogDescription>
              Revise as regras antes de importar. Linhas com erro não serão importadas.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-4 text-sm">
            <Badge variant="default">{validRows.length} válidas</Badge>
            {invalidRows.length > 0 && (
              <Badge variant="destructive">{invalidRows.length} com erro</Badge>
            )}
          </div>

          <div className="flex-1 overflow-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Campo</TableHead>
                  <TableHead>Operador</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Meta</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Mês</TableHead>
                  <TableHead>Obs</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedRows.map((row, idx) => (
                  <TableRow key={idx} className={row.errors.length > 0 ? 'bg-destructive/10' : ''}>
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>{row.campo_alvo}</TableCell>
                    <TableCell>{row.operador}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{row.valor}</TableCell>
                    <TableCell>{row.entra_meta}</TableCell>
                    <TableCell>{row.responsavel_campo}</TableCell>
                    <TableCell>{row.regra_mes}</TableCell>
                    <TableCell className="max-w-[100px] truncate">{row.observacao}</TableCell>
                    <TableCell>
                      {row.errors.length > 0 ? (
                        <span className="text-xs text-destructive">{row.errors.join(', ')}</span>
                      ) : (
                        <Badge variant="outline" className="text-xs">OK</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="reprocess"
              checked={reprocessAfterImport}
              onCheckedChange={(checked) => setReprocessAfterImport(!!checked)}
            />
            <Label htmlFor="reprocess" className="text-sm cursor-pointer">
              Reprocessar pendentes após importar
            </Label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleImportConfirm}
              disabled={validRows.length === 0 || isImporting}
            >
              {isImporting ? 'Importando...' : `Importar ${validRows.length} regras`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
