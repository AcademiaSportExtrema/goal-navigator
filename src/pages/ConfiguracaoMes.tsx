import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Calendar, DollarSign, Users, TrendingUp, Save, Plus, Trash2 } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { MetaMensal, Consultora, MetaConsultora, ComissaoNivel } from '@/types/database';

interface NivelConfig {
  nivel: number;
  de_percent: string;
  ate_percent: string;
  comissao_percent: string;
}

const defaultNiveis: NivelConfig[] = [
  { nivel: 1, de_percent: '0', ate_percent: '79', comissao_percent: '2' },
  { nivel: 2, de_percent: '80', ate_percent: '99', comissao_percent: '3' },
  { nivel: 3, de_percent: '100', ate_percent: '119', comissao_percent: '4' },
  { nivel: 4, de_percent: '120', ate_percent: '149', comissao_percent: '5' },
  { nivel: 5, de_percent: '150', ate_percent: '999', comissao_percent: '6' },
];

export default function ConfiguracaoMes() {
  const [mesSelecionado, setMesSelecionado] = useState(format(new Date(), 'yyyy-MM'));
  const [metaTotal, setMetaTotal] = useState('');
  const [percentuais, setPercentuais] = useState<Record<string, string>>({});
  const [niveis, setNiveis] = useState<NivelConfig[]>(defaultNiveis);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar consultoras
  const { data: consultoras } = useQuery({
    queryKey: ['consultoras-ativas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consultoras')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      
      if (error) throw error;
      return data as Consultora[];
    },
  });

  // Buscar meta do mês selecionado
  const { data: metaMensal, refetch: refetchMeta } = useQuery({
    queryKey: ['meta-mensal', mesSelecionado],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('metas_mensais')
        .select('*')
        .eq('mes_referencia', mesSelecionado)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as MetaMensal | null;
    },
  });

  // Buscar metas por consultora
  const { data: metasConsultoras } = useQuery({
    queryKey: ['metas-consultoras', metaMensal?.id],
    enabled: !!metaMensal?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('metas_consultoras')
        .select('*')
        .eq('meta_mensal_id', metaMensal!.id);
      
      if (error) throw error;
      return data as MetaConsultora[];
    },
  });

  // Buscar níveis de comissão
  const { data: niveisComissao } = useQuery({
    queryKey: ['comissao-niveis', metaMensal?.id],
    enabled: !!metaMensal?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comissao_niveis')
        .select('*')
        .eq('meta_mensal_id', metaMensal!.id)
        .order('nivel');
      
      if (error) throw error;
      return data as ComissaoNivel[];
    },
  });

  // Preencher dados quando carregar
  useEffect(() => {
    if (metaMensal) {
      setMetaTotal(String(metaMensal.meta_total));
    } else {
      setMetaTotal('');
    }
  }, [metaMensal]);

  useEffect(() => {
    if (metasConsultoras && consultoras) {
      const newPercentuais: Record<string, string> = {};
      for (const mc of metasConsultoras) {
        newPercentuais[mc.consultora_id] = String(Number(mc.percentual) * 100);
      }
      setPercentuais(newPercentuais);
    } else {
      setPercentuais({});
    }
  }, [metasConsultoras, consultoras]);

  useEffect(() => {
    if (niveisComissao && niveisComissao.length > 0) {
      setNiveis(niveisComissao.map(n => ({
        nivel: n.nivel,
        de_percent: String(Number(n.de_percent) * 100),
        ate_percent: String(Number(n.ate_percent) * 100),
        comissao_percent: String(Number(n.comissao_percent) * 100),
      })));
    } else {
      setNiveis(defaultNiveis);
    }
  }, [niveisComissao]);

  // Salvar configurações
  const salvarConfig = useMutation({
    mutationFn: async () => {
      // Validações
      const metaNum = parseFloat(metaTotal.replace(/\D/g, '')) / 100;
      if (!metaNum || metaNum <= 0) {
        throw new Error('Meta total deve ser maior que zero');
      }

      // Verificar soma dos percentuais
      const somaPercentuais = Object.values(percentuais).reduce((acc, p) => acc + (parseFloat(p) || 0), 0);
      if (somaPercentuais > 0 && Math.abs(somaPercentuais - 100) > 0.01) {
        throw new Error(`A soma dos percentuais deve ser 100% (atual: ${somaPercentuais.toFixed(1)}%)`);
      }

      // Criar ou atualizar meta mensal
      let metaId = metaMensal?.id;

      if (metaId) {
        const { error } = await supabase
          .from('metas_mensais')
          .update({ meta_total: metaNum })
          .eq('id', metaId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('metas_mensais')
          .insert({ mes_referencia: mesSelecionado, meta_total: metaNum })
          .select()
          .single();
        if (error) throw error;
        metaId = data.id;
      }

      // Atualizar metas por consultora
      await supabase.from('metas_consultoras').delete().eq('meta_mensal_id', metaId);
      
      const metasConsultorasInsert = Object.entries(percentuais)
        .filter(([_, p]) => parseFloat(p) > 0)
        .map(([consultora_id, p]) => ({
          meta_mensal_id: metaId,
          consultora_id,
          percentual: parseFloat(p) / 100,
        }));
      
      if (metasConsultorasInsert.length > 0) {
        const { error } = await supabase.from('metas_consultoras').insert(metasConsultorasInsert);
        if (error) throw error;
      }

      // Atualizar níveis de comissão
      await supabase.from('comissao_niveis').delete().eq('meta_mensal_id', metaId);
      
      const niveisInsert = niveis.map(n => ({
        meta_mensal_id: metaId,
        nivel: n.nivel,
        de_percent: parseFloat(n.de_percent) / 100,
        ate_percent: parseFloat(n.ate_percent) / 100,
        comissao_percent: parseFloat(n.comissao_percent) / 100,
      }));
      
      const { error: niveisError } = await supabase.from('comissao_niveis').insert(niveisInsert);
      if (niveisError) throw niveisError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta-mensal'] });
      queryClient.invalidateQueries({ queryKey: ['metas-consultoras'] });
      queryClient.invalidateQueries({ queryKey: ['comissao-niveis'] });
      toast({ title: 'Configurações salvas com sucesso!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    },
  });

  const formatCurrency = (value: string) => {
    const num = value.replace(/\D/g, '');
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(parseFloat(num) / 100 || 0);
  };

  const somaPercentuais = Object.values(percentuais).reduce((acc, p) => acc + (parseFloat(p) || 0), 0);

  const meses = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(addMonths(new Date(), 2), 11 - i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy', { locale: ptBR }),
    };
  });

  return (
    <AppLayout title="Configuração do Mês">
      <div className="space-y-6">
        {/* Seletor de mês */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {meses.map(m => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Meta Total */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Meta Total do Mês
              </CardTitle>
              <CardDescription>
                Defina o valor total da meta para o mês selecionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Valor da Meta</Label>
                <Input
                  value={metaTotal ? formatCurrency(metaTotal) : ''}
                  onChange={(e) => setMetaTotal(e.target.value.replace(/\D/g, ''))}
                  placeholder="R$ 0,00"
                  className="text-lg font-medium"
                />
              </div>
            </CardContent>
          </Card>

          {/* Distribuição por consultora */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Distribuição por Consultora
              </CardTitle>
              <CardDescription>
                Defina o percentual de cada consultora (soma = 100%)
                <span className={`ml-2 font-medium ${
                  Math.abs(somaPercentuais - 100) < 0.01 ? 'text-success' : 
                  somaPercentuais > 100 ? 'text-destructive' : 'text-warning'
                }`}>
                  Total: {somaPercentuais.toFixed(1)}%
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {consultoras && consultoras.length > 0 ? (
                <div className="space-y-3">
                  {consultoras.map(c => (
                    <div key={c.id} className="flex items-center gap-3">
                      <span className="flex-1 text-sm">{c.nome}</span>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={percentuais[c.id] || ''}
                          onChange={(e) => setPercentuais(p => ({ ...p, [c.id]: e.target.value }))}
                          className="w-20 text-right"
                          placeholder="0"
                        />
                        <span className="text-muted-foreground">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-muted-foreground">
                  Nenhuma consultora cadastrada.{' '}
                  <a href="/consultoras" className="text-primary hover:underline">
                    Cadastrar →
                  </a>
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Níveis de Comissão */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Níveis de Comissão
            </CardTitle>
            <CardDescription>
              Configure as 5 faixas de atingimento e respectivos percentuais de comissão
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-3 text-sm font-medium text-muted-foreground">
                <span>Nível</span>
                <span>De (%)</span>
                <span>Até (%)</span>
                <span>Comissão (%)</span>
              </div>
              {niveis.map((nivel, index) => (
                <div key={nivel.nivel} className="grid grid-cols-4 gap-3 items-center">
                  <span className="font-medium">Nível {nivel.nivel}</span>
                  <Input
                    type="number"
                    value={nivel.de_percent}
                    onChange={(e) => {
                      const newNiveis = [...niveis];
                      newNiveis[index].de_percent = e.target.value;
                      setNiveis(newNiveis);
                    }}
                    className="text-center"
                  />
                  <Input
                    type="number"
                    value={nivel.ate_percent}
                    onChange={(e) => {
                      const newNiveis = [...niveis];
                      newNiveis[index].ate_percent = e.target.value;
                      setNiveis(newNiveis);
                    }}
                    className="text-center"
                  />
                  <Input
                    type="number"
                    step="0.1"
                    value={nivel.comissao_percent}
                    onChange={(e) => {
                      const newNiveis = [...niveis];
                      newNiveis[index].comissao_percent = e.target.value;
                      setNiveis(newNiveis);
                    }}
                    className="text-center"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Botão salvar */}
        <div className="flex justify-end">
          <Button 
            size="lg" 
            onClick={() => salvarConfig.mutate()}
            disabled={salvarConfig.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {salvarConfig.isPending ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
