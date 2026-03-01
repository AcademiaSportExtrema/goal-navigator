

## Metas Semanais — Proporção semanal configurável + acompanhamento no Dashboard

### Conceito
Permitir ao admin definir, na Configuração do Mês, qual percentual da meta deve ser atingido em cada semana (ex: S1=30%, S2=25%, S3=25%, S4=20%). O Dashboard do admin e das consultoras mostra uma barra ou indicador comparando o vendido acumulado vs. a meta acumulada esperada até a semana atual, evidenciando se estão adiantadas ou atrasadas.

### 1. Nova tabela no banco de dados

```sql
CREATE TABLE public.meta_semanal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_mensal_id uuid NOT NULL REFERENCES metas_mensais(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL,
  semana integer NOT NULL CHECK (semana BETWEEN 1 AND 5),
  peso_percent numeric NOT NULL DEFAULT 25,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (meta_mensal_id, semana)
);

ALTER TABLE public.meta_semanal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own empresa meta_semanal"
  ON public.meta_semanal FOR ALL
  USING (has_role(auth.uid(), 'admin') AND empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Super admins full access meta_semanal"
  ON public.meta_semanal FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users view own empresa meta_semanal"
  ON public.meta_semanal FOR SELECT
  USING (empresa_id = get_user_empresa_id(auth.uid()));
```

### 2. Configuração do Mês (`ConfiguracaoMes.tsx`)
- Adicionar seção "Distribuição Semanal" abaixo da meta total
- 4-5 inputs para os pesos semanais (S1, S2, S3, S4, S5) com default 25% cada
- Totalizar e alertar se soma ≠ 100%
- Salvar na tabela `meta_semanal` junto com o restante

### 3. Lógica de cálculo da semana atual
- Determinar em qual semana do mês estamos (dias 1-7 = S1, 8-14 = S2, 15-21 = S3, 22-28 = S4, 29+ = S5 ou S4)
- Meta acumulada esperada = soma dos pesos das semanas já concluídas + proporção da semana atual
- Comparar com vendido acumulado para gerar status (adiantada/no ritmo/atrasada)

### 4. Dashboard Admin (`Dashboard.tsx`)
- Novo card "Ritmo Semanal" na seção de vendas consultoras
- Mostra: meta esperada até agora vs. vendido, com indicador visual (verde/amarelo/vermelho)
- Na tabela de consultoras, adicionar coluna "Ritmo" com ícone de status

### 5. Dashboard Consultora (visão consultora no `Dashboard.tsx` + `MinhaPerformance.tsx`)
- Card "Ritmo da Semana" mostrando se está no ritmo ou atrasada
- Barra de progresso comparando vendido vs. meta acumulada esperada
- Mensagem motivacional baseada no status

### Detalhes técnicos
- Query: buscar `meta_semanal` pelo `meta_mensal_id` do mês selecionado
- Se não houver config semanal, assumir distribuição uniforme (25% por semana)
- Registrar `meta_semanal` no `useDashboardVisibilidade` como componente toggleável (`card_ritmo_semanal`)

