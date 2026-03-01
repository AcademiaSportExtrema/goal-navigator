// Tipos para o sistema de metas

export type AppRole = 'admin' | 'consultora' | 'super_admin';

export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing';

export interface Empresa {
  id: string;
  nome: string;
  slug: string;
  ativo: boolean;
  subscription_status: string;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export type AjusteStatus = 'pendente' | 'aprovado' | 'rejeitado';

export type UploadStatus = 'enviado' | 'importando' | 'concluido' | 'erro';

export type CampoAlvo = 
  | 'produto' 
  | 'plano' 
  | 'modalidades' 
  | 'forma_pagamento' 
  | 'condicao_pagamento' 
  | 'empresa' 
  | 'situacao_contrato' 
  | 'resp_venda' 
  | 'resp_recebimento';

export type OperadorRegra = 'contem' | 'igual' | 'comeca_com' | 'termina_com' | 'regex';

export type ResponsavelCampo = 'resp_venda' | 'resp_recebimento';

export type RegraMes = 'DATA_LANCAMENTO' | 'DATA_INICIO';

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  consultora_id: string | null;
  created_at: string;
}

export interface Consultora {
  id: string;
  nome: string;
  email: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Upload {
  id: string;
  user_id: string | null;
  criado_em: string;
  arquivo_path: string;
  arquivo_nome: string;
  status: UploadStatus;
  resumo: {
    total_linhas?: number;
    importados?: number;
    duplicados?: number;
    erros?: number;
    pendentes_regra?: number;
  };
  erros: Array<{ linha: number; erro: string }>;
}

export interface Lancamento {
  id: string;
  upload_id: string;
  produto: string | null;
  matricula: string | null;
  nome_cliente: string | null;
  resp_venda: string | null;
  resp_recebimento: string | null;
  data_cadastro: string | null;
  numero_contrato: string | null;
  data_inicio: string | null;
  data_termino: string | null;
  duracao: string | null;
  modalidades: string | null;
  turmas: string | null;
  categoria: string | null;
  plano: string | null;
  situacao_contrato: string | null;
  data_lancamento: string | null;
  forma_pagamento: string | null;
  condicao_pagamento: string | null;
  valor: number;
  empresa: string | null;
  // Campos de classificação
  entra_meta: boolean;
  pendente_regra: boolean;
  consultora_chave: string | null;
  mes_competencia: string | null;
  regra_aplicada_id: string | null;
  motivo_classificacao: string | null;
  hash_linha: string | null;
  created_at: string;
}

export interface RegraMeta {
  id: string;
  ativo: boolean;
  prioridade: number;
  campo_alvo: CampoAlvo;
  operador: OperadorRegra;
  valor: string;
  entra_meta: boolean;
  responsavel_campo: ResponsavelCampo;
  regra_mes: RegraMes;
  observacao: string | null;
  created_at: string;
  updated_at: string;
}

export interface MetaMensal {
  id: string;
  mes_referencia: string;
  meta_total: number;
  created_at: string;
  updated_at: string;
}

export interface MetaConsultora {
  id: string;
  meta_mensal_id: string;
  consultora_id: string;
  percentual: number;
  created_at: string;
}

export interface ComissaoNivel {
  id: string;
  meta_mensal_id: string;
  nivel: number;
  de_percent: number;
  ate_percent: number;
  comissao_percent: number;
  created_at: string;
}

// Tipos para dashboard
export interface ResumoMeta {
  mes_referencia: string;
  meta_total: number;
  total_vendido: number;
  percentual_atingido: number;
  nivel_atual: number;
  comissao_estimada: number;
}

export interface ResumoConsultora extends ResumoMeta {
  consultora_id: string;
  consultora_nome: string;
  meta_individual: number;
}

export interface SolicitacaoAjuste {
  id: string;
  lancamento_id: string;
  consultora_id: string;
  resp_recebimento_atual: string | null;
  resp_recebimento_novo: string;
  justificativa: string;
  status: AjusteStatus;
  admin_comentario: string | null;
  admin_user_id: string | null;
  created_at: string;
  updated_at: string;
}
