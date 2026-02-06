
# Sistema de Metas + Análises Gerenciais

## Visão Geral
Sistema completo para gestão de metas comerciais e análises gerenciais, com importação de dados via Excel, motor de regras configurável para classificação de vendas, e cálculo automático de comissões em 5 níveis.

---

## Design & Identidade Visual
- **Tema:** Dashboard corporativo elegante com sidebar escura
- **Paleta:** Fundo escuro na navegação, área de conteúdo clara, cards com bordas sutis
- **Tipografia:** Limpa e profissional, tabelas com boa densidade de dados
- **Acentos:** Cores específicas para status (verde=meta atingida, vermelho=pendente, amarelo=atenção)
- **Gráficos:** Visualizações coloridas contrastando com o tema neutro

---

## Funcionalidades por Tela

### 1. Login & Autenticação
- Tela de login com email/senha
- Dois papéis: **Admin** (acesso total) e **Consultora** (acesso restrito)
- Redirecionamento automático conforme papel do usuário

### 2. Dashboard Principal (Admin)
- Visão geral do mês: total de vendas, meta, % atingimento
- Cards resumo: lançamentos importados, pendentes de regra, próximos vencimentos
- Acesso rápido às principais áreas do sistema

### 3. Upload Diário
- Drag & drop ou seleção de arquivo Excel (.xls/.xlsx)
- Importação com barra de progresso
- Resumo pós-importação: linhas importadas, duplicadas ignoradas, erros, pendentes de regra
- Histórico de uploads anteriores com status

### 4. Análises Gerenciais (100% dos dados)
- Tabela completa com todas as 20 colunas do Excel
- Filtros avançados: data, empresa, produto, plano, responsável, situação, forma de pagamento
- Ordenação por qualquer coluna
- Exportação para CSV
- Busca textual rápida

### 5. Motor de Regras (Configuração)
- Lista de regras com prioridade (drag & drop para reordenar)
- Criação de regra: selecionar campo, operador (contém, igual, começa com, regex), valor
- Definir: entra na meta? qual responsável conta? qual data define o mês de competência?
- Preview: testar regra em alguns lançamentos antes de salvar
- Ativar/desativar regras sem excluir

### 6. Pendências de Classificação
- Lista agrupada por combinação Produto/Plano/Empresa sem regra
- Mostra quantidade e soma de valores
- Botão "Criar regra" que pré-preenche os campos
- Botão "Reprocessar período" para aplicar novas regras retroativamente

### 7. Configuração do Mês
- Seletor de mês (YYYY-MM)
- Definir meta total do mês em R$
- Distribuição percentual por consultora (soma deve dar 100%)
- Configurar 5 níveis de comissão:
  - Nível 1: 0-79% → X% comissão
  - Nível 2: 80-99% → Y% comissão
  - Nível 3: 100-119% → Z% comissão
  - ... e assim por diante

### 8. Cadastro de Consultoras (Admin)
- Lista de consultoras ativas
- Adicionar/editar: nome, email, status ativo
- Vincular nome do Excel (resp_venda) ao cadastro

### 9. Dashboard de Metas (Admin)
- Seletor de mês
- Cards grandes: total válido na meta, % atingimento geral, comissão total estimada
- Tabela por consultora: meta individual, vendas, %, nível alcançado, comissão
- Gráfico de barras comparativo entre consultoras
- Detalhamento: lista de lançamentos que entraram na meta (com filtros)

### 10. Minha Performance (Consultora)
- Visão simplificada apenas dos próprios resultados
- Cards: meta pessoal, vendas realizadas, % atingido, nível atual, comissão estimada
- Lista dos próprios lançamentos que contam para meta

---

## Backend (Lovable Cloud)

### Banco de Dados
- **consultoras:** cadastro das vendedoras
- **uploads:** controle de arquivos importados e status
- **lancamentos:** todos os dados do Excel + campos de classificação (entra_meta, mes_competencia, etc.)
- **regras_meta:** motor de regras configurável
- **metas_mensais:** meta total por mês
- **metas_consultoras:** percentual de cada consultora no mês
- **comissao_niveis:** 5 faixas de comissão por mês
- **user_roles:** controle de papéis (admin/consultora)

### Edge Functions
1. **upload-importar-xls:** processa Excel, normaliza dados, deduplica, insere e classifica
2. **classificar-meta:** aplica regras por prioridade, define entra_meta, consultora_chave e mes_competencia

### Segurança (RLS)
- Admin: acesso total a todas as tabelas
- Consultora: apenas visualização de próprios resultados e lançamentos vinculados

---

## Fluxo Principal

1. Admin faz upload do Excel diário
2. Sistema importa 100% dos dados e aplica regras automaticamente
3. Itens sem regra ficam como "pendentes" para admin configurar
4. Admin define meta do mês e distribuição por consultora
5. Dashboard atualiza automaticamente mostrando progresso e comissões
6. Consultoras acessam e veem apenas sua performance individual

---

## Experiência do Usuário

- **Importação inteligente:** ignora duplicatas automaticamente, mostra erros claros
- **Regras visuais:** interface intuitiva para criar regras sem conhecimento técnico
- **Feedback imediato:** ao criar regra, mostra preview de como afetará os dados
- **Reprocessamento:** possibilidade de recalcular todo um mês após ajustar regras
- **Responsivo:** funciona em desktop e tablet (sidebar recolhível)
