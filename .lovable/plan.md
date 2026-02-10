
# Gerencial para Consultoras: Restricoes e Ajuste Inline

## Contexto

Atualmente, a rota `/gerencial` exige `requiredRole="admin"`, impedindo consultoras de acessar. O plano e permitir acesso das consultoras com restricoes especificas e adicionar a funcionalidade de solicitar ajuste diretamente da tabela.

## Mudancas

### 1. Permitir consultoras na rota `/gerencial` (App.tsx)

- Remover `requiredRole="admin"` da rota `/gerencial` para que o sistema de permissoes dinamico (`permissoes_perfil`) controle o acesso
- Assim, o admin pode habilitar/desabilitar o acesso das consultoras ao Gerencial via configuracao

### 2. Adicionar "Gerencial" ao menu da consultora (AppSidebar.tsx)

- Adicionar item `{ title: 'Gerencial', icon: FileText, href: '/gerencial' }` ao array `consultoraMenuItems`
- O sistema de permissoes ja controla a visibilidade no menu

### 3. Restricoes para consultora no Gerencial (Gerencial.tsx)

Usar o hook `useAuth()` para detectar se o usuario e consultora e aplicar:

**a) Filtro de periodo fixo no mes corrente:**
- Quando `role === 'consultora'`, forcar `dateRange` para `'thisMonth'` no estado inicial
- Esconder o seletor de periodo e os filtros de data personalizada
- Esconder a opcao "Todos os periodos" e "Mês passado" -- a consultora so ve dados do mes atual

**b) Esconder botao de exportar CSV:**
- Renderizar o botao "Exportar CSV" apenas quando `role !== 'consultora'`

**c) Adicionar coluna "Acao" com botao "Solicitar Ajuste":**
- Adicionar uma coluna extra na tabela (visivel apenas para consultoras)
- Cada linha tera um botao que abre um dialog inline para solicitar ajuste do responsavel pelo recebimento
- O dialog reutiliza a mesma logica do `SolicitarAjuste.tsx`: mostra dados do lancamento, campo de justificativa, e envia para `solicitacoes_ajuste`
- Isso elimina a necessidade da consultora ir a outra pagina para fazer a solicitacao

### 4. Restricao de dados via RLS (ja existente)

- A politica RLS `Consultoras view own lancamentos` ja filtra para que consultoras vejam apenas seus proprios lancamentos
- Nenhuma mudanca no banco de dados e necessaria

## Detalhes tecnicos

### Gerencial.tsx - Principais alteracoes

```text
1. Import useAuth
2. Obter { role } de useAuth()
3. Estado inicial dateRange: role === 'consultora' ? 'thisMonth' : 'all'
4. Condicional no JSX:
   - Seletor de periodo: escondido se consultora
   - Botao Exportar CSV: escondido se consultora
   - Coluna extra "Acao": visivel se consultora
5. Dialog de solicitacao de ajuste inline (mesmo padrao do SolicitarAjuste.tsx)
```

### Fluxo da consultora no Gerencial

```text
Consultora acessa /gerencial
  -> Ve apenas seus lancamentos (RLS)
  -> Filtrado automaticamente no mes atual
  -> Sem opcao de exportar
  -> Coluna "Acao" com botao "Solicitar Ajuste"
     -> Clica no botao
     -> Dialog abre com dados do lancamento
     -> Preenche justificativa
     -> Envia solicitacao
     -> Solicitacao aparece em /pendencias para o admin
```

### Arquivos modificados

- `src/App.tsx` - Remover requiredRole da rota /gerencial
- `src/components/layout/AppSidebar.tsx` - Adicionar Gerencial ao menu consultora
- `src/pages/Gerencial.tsx` - Adicionar restricoes por role e dialog de ajuste inline
