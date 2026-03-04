export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      analise_email_config: {
        Row: {
          ativo: boolean
          created_at: string
          email: string
          empresa_id: string
          id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email: string
          empresa_id: string
          id?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string
          empresa_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analise_email_config_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      analise_ia: {
        Row: {
          conteudo: string
          created_at: string
          empresa_id: string
          id: string
          mes_referencia: string
          upload_id: string | null
        }
        Insert: {
          conteudo: string
          created_at?: string
          empresa_id: string
          id?: string
          mes_referencia: string
          upload_id?: string | null
        }
        Update: {
          conteudo?: string
          created_at?: string
          empresa_id?: string
          id?: string
          mes_referencia?: string
          upload_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analise_ia_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analise_ia_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string
          actor_role: Database["public"]["Enums"]["app_role"] | null
          created_at: string
          empresa_id: string | null
          id: string
          metadata: Json | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id: string
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_diretrizes: {
        Row: {
          ativo: boolean
          created_at: string
          empresa_id: string
          id: string
          texto: string
          tipo: Database["public"]["Enums"]["coach_diretriz_tipo"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          empresa_id: string
          id?: string
          texto: string
          tipo: Database["public"]["Enums"]["coach_diretriz_tipo"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          empresa_id?: string
          id?: string
          texto?: string
          tipo?: Database["public"]["Enums"]["coach_diretriz_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_diretrizes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      comissao_niveis: {
        Row: {
          ate_percent: number
          comissao_percent: number
          created_at: string | null
          de_percent: number
          empresa_id: string
          id: string
          meta_mensal_id: string
          nivel: number
        }
        Insert: {
          ate_percent: number
          comissao_percent: number
          created_at?: string | null
          de_percent: number
          empresa_id: string
          id?: string
          meta_mensal_id: string
          nivel: number
        }
        Update: {
          ate_percent?: number
          comissao_percent?: number
          created_at?: string | null
          de_percent?: number
          empresa_id?: string
          id?: string
          meta_mensal_id?: string
          nivel?: number
        }
        Relationships: [
          {
            foreignKeyName: "comissao_niveis_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissao_niveis_meta_mensal_id_fkey"
            columns: ["meta_mensal_id"]
            isOneToOne: false
            referencedRelation: "metas_mensais"
            referencedColumns: ["id"]
          },
        ]
      }
      consultoras: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          email: string | null
          empresa_id: string
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          email?: string | null
          empresa_id: string
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          email?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultoras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_visibilidade: {
        Row: {
          componente: string
          created_at: string
          empresa_id: string
          id: string
          updated_at: string
          visivel: boolean
        }
        Insert: {
          componente: string
          created_at?: string
          empresa_id: string
          id?: string
          updated_at?: string
          visivel?: boolean
        }
        Update: {
          componente?: string
          created_at?: string
          empresa_id?: string
          id?: string
          updated_at?: string
          visivel?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_visibilidade_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      devedores_cobranca_historico: {
        Row: {
          chave_cobranca: string
          contato_em: string
          created_at: string
          created_by: string
          created_by_label: string
          devedor_parcela_id: string | null
          empresa_id: string
          id: string
          observacao: string | null
          tipo: Database["public"]["Enums"]["cobranca_evento_tipo"]
        }
        Insert: {
          chave_cobranca: string
          contato_em: string
          created_at?: string
          created_by: string
          created_by_label: string
          devedor_parcela_id?: string | null
          empresa_id: string
          id?: string
          observacao?: string | null
          tipo: Database["public"]["Enums"]["cobranca_evento_tipo"]
        }
        Update: {
          chave_cobranca?: string
          contato_em?: string
          created_at?: string
          created_by?: string
          created_by_label?: string
          devedor_parcela_id?: string | null
          empresa_id?: string
          id?: string
          observacao?: string | null
          tipo?: Database["public"]["Enums"]["cobranca_evento_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "devedores_cobranca_historico_devedor_parcela_id_fkey"
            columns: ["devedor_parcela_id"]
            isOneToOne: false
            referencedRelation: "devedores_parcelas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devedores_cobranca_historico_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      devedores_parcelas: {
        Row: {
          arquivo_nome: string | null
          chave_cobranca: string | null
          cobranca_enviada: boolean
          cod_empresa: string | null
          codigo_parcela: string | null
          consultor: string | null
          contrato: string | null
          convenio: string | null
          data_vencimento: string | null
          em_remessa: string | null
          empresa_id: string
          id: string
          nome: string | null
          pago_em: string | null
          parcela: string | null
          status_cobranca: Database["public"]["Enums"]["cobranca_status"]
          ultima_observacao: string | null
          ultimo_contato_em: string | null
          uploaded_at: string
          uploaded_by: string | null
          valor_parcela: number | null
        }
        Insert: {
          arquivo_nome?: string | null
          chave_cobranca?: string | null
          cobranca_enviada?: boolean
          cod_empresa?: string | null
          codigo_parcela?: string | null
          consultor?: string | null
          contrato?: string | null
          convenio?: string | null
          data_vencimento?: string | null
          em_remessa?: string | null
          empresa_id: string
          id?: string
          nome?: string | null
          pago_em?: string | null
          parcela?: string | null
          status_cobranca?: Database["public"]["Enums"]["cobranca_status"]
          ultima_observacao?: string | null
          ultimo_contato_em?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          valor_parcela?: number | null
        }
        Update: {
          arquivo_nome?: string | null
          chave_cobranca?: string | null
          cobranca_enviada?: boolean
          cod_empresa?: string | null
          codigo_parcela?: string | null
          consultor?: string | null
          contrato?: string | null
          convenio?: string | null
          data_vencimento?: string | null
          em_remessa?: string | null
          empresa_id?: string
          id?: string
          nome?: string | null
          pago_em?: string | null
          parcela?: string | null
          status_cobranca?: Database["public"]["Enums"]["cobranca_status"]
          ultima_observacao?: string | null
          ultimo_contato_em?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          valor_parcela?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "devedores_parcelas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          logo_url: string | null
          nome: string
          slug: string
          subscription_status: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          logo_url?: string | null
          nome: string
          slug: string
          subscription_status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          logo_url?: string | null
          nome?: string
          slug?: string
          subscription_status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fechamento_caixa_f360: {
        Row: {
          created_at: string
          data: string
          empresa_id: string
          id: string
          valor_f360: number
          valor_pix_f360: number
        }
        Insert: {
          created_at?: string
          data: string
          empresa_id: string
          id?: string
          valor_f360?: number
          valor_pix_f360?: number
        }
        Update: {
          created_at?: string
          data?: string
          empresa_id?: string
          id?: string
          valor_f360?: number
          valor_pix_f360?: number
        }
        Relationships: [
          {
            foreignKeyName: "fechamento_caixa_f360_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos: {
        Row: {
          categoria: string | null
          condicao_pagamento: string | null
          consultora_chave: string | null
          created_at: string | null
          data_cadastro: string | null
          data_inicio: string | null
          data_lancamento: string | null
          data_termino: string | null
          duracao: string | null
          empresa: string | null
          empresa_id: string
          entra_meta: boolean | null
          forma_pagamento: string | null
          hash_linha: string | null
          id: string
          matricula: string | null
          mes_competencia: string | null
          modalidades: string | null
          motivo_classificacao: string | null
          nome_cliente: string | null
          numero_contrato: string | null
          pendente_regra: boolean | null
          plano: string | null
          produto: string | null
          regra_aplicada_id: string | null
          resp_recebimento: string | null
          resp_venda: string | null
          situacao_contrato: string | null
          turmas: string | null
          upload_id: string
          valor: number | null
        }
        Insert: {
          categoria?: string | null
          condicao_pagamento?: string | null
          consultora_chave?: string | null
          created_at?: string | null
          data_cadastro?: string | null
          data_inicio?: string | null
          data_lancamento?: string | null
          data_termino?: string | null
          duracao?: string | null
          empresa?: string | null
          empresa_id: string
          entra_meta?: boolean | null
          forma_pagamento?: string | null
          hash_linha?: string | null
          id?: string
          matricula?: string | null
          mes_competencia?: string | null
          modalidades?: string | null
          motivo_classificacao?: string | null
          nome_cliente?: string | null
          numero_contrato?: string | null
          pendente_regra?: boolean | null
          plano?: string | null
          produto?: string | null
          regra_aplicada_id?: string | null
          resp_recebimento?: string | null
          resp_venda?: string | null
          situacao_contrato?: string | null
          turmas?: string | null
          upload_id: string
          valor?: number | null
        }
        Update: {
          categoria?: string | null
          condicao_pagamento?: string | null
          consultora_chave?: string | null
          created_at?: string | null
          data_cadastro?: string | null
          data_inicio?: string | null
          data_lancamento?: string | null
          data_termino?: string | null
          duracao?: string | null
          empresa?: string | null
          empresa_id?: string
          entra_meta?: boolean | null
          forma_pagamento?: string | null
          hash_linha?: string | null
          id?: string
          matricula?: string | null
          mes_competencia?: string | null
          modalidades?: string | null
          motivo_classificacao?: string | null
          nome_cliente?: string | null
          numero_contrato?: string | null
          pendente_regra?: boolean | null
          plano?: string | null
          produto?: string | null
          regra_aplicada_id?: string | null
          resp_recebimento?: string | null
          resp_venda?: string | null
          situacao_contrato?: string | null
          turmas?: string | null
          upload_id?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_lancamentos_regra"
            columns: ["regra_aplicada_id"]
            isOneToOne: false
            referencedRelation: "regras_meta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_anual: {
        Row: {
          ano: number
          created_at: string
          empresa_id: string
          id: string
          meta_total: number
          updated_at: string
        }
        Insert: {
          ano: number
          created_at?: string
          empresa_id: string
          id?: string
          meta_total?: number
          updated_at?: string
        }
        Update: {
          ano?: number
          created_at?: string
          empresa_id?: string
          id?: string
          meta_total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_anual_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_anual_meses: {
        Row: {
          empresa_id: string
          id: string
          mes: number
          meta_anual_id: string
          peso_percent: number
        }
        Insert: {
          empresa_id: string
          id?: string
          mes: number
          meta_anual_id: string
          peso_percent?: number
        }
        Update: {
          empresa_id?: string
          id?: string
          mes?: number
          meta_anual_id?: string
          peso_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "meta_anual_meses_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_anual_meses_meta_anual_id_fkey"
            columns: ["meta_anual_id"]
            isOneToOne: false
            referencedRelation: "meta_anual"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_semanal: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          meta_mensal_id: string
          peso_percent: number
          semana: number
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          meta_mensal_id: string
          peso_percent?: number
          semana: number
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          meta_mensal_id?: string
          peso_percent?: number
          semana?: number
        }
        Relationships: [
          {
            foreignKeyName: "meta_semanal_meta_mensal_id_fkey"
            columns: ["meta_mensal_id"]
            isOneToOne: false
            referencedRelation: "metas_mensais"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_consultoras: {
        Row: {
          consultora_id: string
          created_at: string | null
          empresa_id: string
          id: string
          meta_mensal_id: string
          percentual: number
        }
        Insert: {
          consultora_id: string
          created_at?: string | null
          empresa_id: string
          id?: string
          meta_mensal_id: string
          percentual: number
        }
        Update: {
          consultora_id?: string
          created_at?: string | null
          empresa_id?: string
          id?: string
          meta_mensal_id?: string
          percentual?: number
        }
        Relationships: [
          {
            foreignKeyName: "metas_consultoras_consultora_id_fkey"
            columns: ["consultora_id"]
            isOneToOne: false
            referencedRelation: "consultoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_consultoras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_consultoras_meta_mensal_id_fkey"
            columns: ["meta_mensal_id"]
            isOneToOne: false
            referencedRelation: "metas_mensais"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_mensais: {
        Row: {
          created_at: string | null
          empresa_id: string
          id: string
          mes_referencia: string
          meta_total: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          empresa_id: string
          id?: string
          mes_referencia: string
          meta_total: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          empresa_id?: string
          id?: string
          mes_referencia?: string
          meta_total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metas_mensais_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos_agregadores: {
        Row: {
          agregador: string
          created_at: string
          data_recebimento: string | null
          empresa_id: string
          id: string
          mes_referencia: string
          observacao: string | null
          quantidade_clientes: number
          valor: number
        }
        Insert: {
          agregador: string
          created_at?: string
          data_recebimento?: string | null
          empresa_id: string
          id?: string
          mes_referencia: string
          observacao?: string | null
          quantidade_clientes?: number
          valor?: number
        }
        Update: {
          agregador?: string
          created_at?: string
          data_recebimento?: string | null
          empresa_id?: string
          id?: string
          mes_referencia?: string
          observacao?: string | null
          quantidade_clientes?: number
          valor?: number
        }
        Relationships: []
      }
      permissoes_perfil: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          permitido: boolean
          role: Database["public"]["Enums"]["app_role"]
          rota: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          permitido?: boolean
          role: Database["public"]["Enums"]["app_role"]
          rota: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          permitido?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          rota?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permissoes_perfil_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      regras_meta: {
        Row: {
          ativo: boolean | null
          campo_alvo: Database["public"]["Enums"]["campo_alvo"]
          created_at: string | null
          empresa_id: string
          entra_meta: boolean
          id: string
          observacao: string | null
          operador: Database["public"]["Enums"]["operador_regra"]
          prioridade: number
          regra_mes: Database["public"]["Enums"]["regra_mes"] | null
          responsavel_campo:
            | Database["public"]["Enums"]["responsavel_campo"]
            | null
          updated_at: string | null
          valor: string
        }
        Insert: {
          ativo?: boolean | null
          campo_alvo: Database["public"]["Enums"]["campo_alvo"]
          created_at?: string | null
          empresa_id: string
          entra_meta: boolean
          id?: string
          observacao?: string | null
          operador: Database["public"]["Enums"]["operador_regra"]
          prioridade: number
          regra_mes?: Database["public"]["Enums"]["regra_mes"] | null
          responsavel_campo?:
            | Database["public"]["Enums"]["responsavel_campo"]
            | null
          updated_at?: string | null
          valor: string
        }
        Update: {
          ativo?: boolean | null
          campo_alvo?: Database["public"]["Enums"]["campo_alvo"]
          created_at?: string | null
          empresa_id?: string
          entra_meta?: boolean
          id?: string
          observacao?: string | null
          operador?: Database["public"]["Enums"]["operador_regra"]
          prioridade?: number
          regra_mes?: Database["public"]["Enums"]["regra_mes"] | null
          responsavel_campo?:
            | Database["public"]["Enums"]["responsavel_campo"]
            | null
          updated_at?: string | null
          valor?: string
        }
        Relationships: [
          {
            foreignKeyName: "regras_meta_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_ajuste: {
        Row: {
          admin_comentario: string | null
          admin_user_id: string | null
          consultora_id: string
          created_at: string
          empresa_id: string
          id: string
          justificativa: string
          lancamento_id: string
          nome_cliente: string | null
          numero_contrato: string | null
          resp_recebimento_atual: string | null
          resp_recebimento_novo: string
          status: Database["public"]["Enums"]["ajuste_status"]
          updated_at: string
        }
        Insert: {
          admin_comentario?: string | null
          admin_user_id?: string | null
          consultora_id: string
          created_at?: string
          empresa_id: string
          id?: string
          justificativa: string
          lancamento_id: string
          nome_cliente?: string | null
          numero_contrato?: string | null
          resp_recebimento_atual?: string | null
          resp_recebimento_novo: string
          status?: Database["public"]["Enums"]["ajuste_status"]
          updated_at?: string
        }
        Update: {
          admin_comentario?: string | null
          admin_user_id?: string | null
          consultora_id?: string
          created_at?: string
          empresa_id?: string
          id?: string
          justificativa?: string
          lancamento_id?: string
          nome_cliente?: string | null
          numero_contrato?: string | null
          resp_recebimento_atual?: string | null
          resp_recebimento_novo?: string
          status?: Database["public"]["Enums"]["ajuste_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_ajuste_consultora_id_fkey"
            columns: ["consultora_id"]
            isOneToOne: false
            referencedRelation: "consultoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_ajuste_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_ajuste_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "lancamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          created_at: string
          id: string
          is_internal: boolean
          mensagem: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_internal?: boolean
          mensagem: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_internal?: boolean
          mensagem?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          assunto: string
          created_at: string
          created_by: string
          descricao: string
          empresa_id: string
          id: string
          prioridade: Database["public"]["Enums"]["ticket_prioridade"]
          status: Database["public"]["Enums"]["ticket_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          assunto: string
          created_at?: string
          created_by: string
          descricao: string
          empresa_id: string
          id?: string
          prioridade?: Database["public"]["Enums"]["ticket_prioridade"]
          status?: Database["public"]["Enums"]["ticket_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          assunto?: string
          created_at?: string
          created_by?: string
          descricao?: string
          empresa_id?: string
          id?: string
          prioridade?: Database["public"]["Enums"]["ticket_prioridade"]
          status?: Database["public"]["Enums"]["ticket_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      uploads: {
        Row: {
          arquivo_nome: string
          arquivo_path: string
          criado_em: string | null
          empresa_id: string
          erros: Json | null
          id: string
          resumo: Json | null
          status: Database["public"]["Enums"]["upload_status"] | null
          user_id: string | null
        }
        Insert: {
          arquivo_nome: string
          arquivo_path: string
          criado_em?: string | null
          empresa_id: string
          erros?: Json | null
          id?: string
          resumo?: Json | null
          status?: Database["public"]["Enums"]["upload_status"] | null
          user_id?: string | null
        }
        Update: {
          arquivo_nome?: string
          arquivo_path?: string
          criado_em?: string | null
          empresa_id?: string
          erros?: Json | null
          id?: string
          resumo?: Json | null
          status?: Database["public"]["Enums"]["upload_status"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uploads_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          consultora_id: string | null
          created_at: string | null
          empresa_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          consultora_id?: string | null
          created_at?: string | null
          empresa_id: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          consultora_id?: string | null
          created_at?: string | null
          empresa_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_roles_consultora"
            columns: ["consultora_id"]
            isOneToOne: false
            referencedRelation: "consultoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      build_devedor_chave: {
        Args: {
          _cod_empresa: string
          _codigo_parcela: string
          _contrato: string
          _data_vencimento: string
          _nome: string
          _parcela: string
          _valor_parcela: number
        }
        Returns: string
      }
      get_realizado_por_mes: {
        Args: { p_ano: number; p_empresa_id: string }
        Returns: {
          mes: number
          total: number
        }[]
      }
      get_user_consultora_id: { Args: { _user_id: string }; Returns: string }
      get_user_empresa_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_empresa_active: { Args: { _empresa_id: string }; Returns: boolean }
      search_lancamentos_for_ajuste: {
        Args: { _limit?: number; _search?: string }
        Returns: {
          data_lancamento: string
          empresa: string
          id: string
          nome_cliente: string
          numero_contrato: string
          plano: string
          produto: string
          resp_recebimento: string
          resp_venda: string
          valor: number
        }[]
      }
    }
    Enums: {
      ajuste_status: "pendente" | "aprovado" | "rejeitado"
      app_role: "admin" | "consultora" | "super_admin"
      campo_alvo:
        | "produto"
        | "plano"
        | "modalidades"
        | "forma_pagamento"
        | "condicao_pagamento"
        | "empresa"
        | "situacao_contrato"
        | "resp_venda"
        | "resp_recebimento"
      coach_diretriz_tipo: "permitido" | "proibido"
      cobranca_evento_tipo: "tentativa_contato" | "pagamento_confirmado"
      cobranca_status: "pendente" | "em_contato" | "pago"
      operador_regra:
        | "contem"
        | "igual"
        | "comeca_com"
        | "termina_com"
        | "regex"
      regra_mes: "DATA_LANCAMENTO" | "DATA_INICIO"
      responsavel_campo: "resp_venda" | "resp_recebimento"
      ticket_prioridade: "baixa" | "media" | "alta" | "urgente"
      ticket_status: "aberto" | "em_andamento" | "resolvido" | "fechado"
      upload_status: "enviado" | "importando" | "concluido" | "erro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ajuste_status: ["pendente", "aprovado", "rejeitado"],
      app_role: ["admin", "consultora", "super_admin"],
      campo_alvo: [
        "produto",
        "plano",
        "modalidades",
        "forma_pagamento",
        "condicao_pagamento",
        "empresa",
        "situacao_contrato",
        "resp_venda",
        "resp_recebimento",
      ],
      coach_diretriz_tipo: ["permitido", "proibido"],
      cobranca_evento_tipo: ["tentativa_contato", "pagamento_confirmado"],
      cobranca_status: ["pendente", "em_contato", "pago"],
      operador_regra: ["contem", "igual", "comeca_com", "termina_com", "regex"],
      regra_mes: ["DATA_LANCAMENTO", "DATA_INICIO"],
      responsavel_campo: ["resp_venda", "resp_recebimento"],
      ticket_prioridade: ["baixa", "media", "alta", "urgente"],
      ticket_status: ["aberto", "em_andamento", "resolvido", "fechado"],
      upload_status: ["enviado", "importando", "concluido", "erro"],
    },
  },
} as const
