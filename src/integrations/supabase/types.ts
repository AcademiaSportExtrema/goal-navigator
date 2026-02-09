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
      comissao_niveis: {
        Row: {
          ate_percent: number
          comissao_percent: number
          created_at: string | null
          de_percent: number
          id: string
          meta_mensal_id: string
          nivel: number
        }
        Insert: {
          ate_percent: number
          comissao_percent: number
          created_at?: string | null
          de_percent: number
          id?: string
          meta_mensal_id: string
          nivel: number
        }
        Update: {
          ate_percent?: number
          comissao_percent?: number
          created_at?: string | null
          de_percent?: number
          id?: string
          meta_mensal_id?: string
          nivel?: number
        }
        Relationships: [
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
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
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
            foreignKeyName: "lancamentos_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_consultoras: {
        Row: {
          consultora_id: string
          created_at: string | null
          id: string
          meta_mensal_id: string
          percentual: number
        }
        Insert: {
          consultora_id: string
          created_at?: string | null
          id?: string
          meta_mensal_id: string
          percentual: number
        }
        Update: {
          consultora_id?: string
          created_at?: string | null
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
          id: string
          mes_referencia: string
          meta_total: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          mes_referencia: string
          meta_total: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          mes_referencia?: string
          meta_total?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      regras_meta: {
        Row: {
          ativo: boolean | null
          campo_alvo: Database["public"]["Enums"]["campo_alvo"]
          created_at: string | null
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
        Relationships: []
      }
      solicitacoes_ajuste: {
        Row: {
          admin_comentario: string | null
          admin_user_id: string | null
          consultora_id: string
          created_at: string
          id: string
          justificativa: string
          lancamento_id: string
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
          id?: string
          justificativa: string
          lancamento_id: string
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
          id?: string
          justificativa?: string
          lancamento_id?: string
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
            foreignKeyName: "solicitacoes_ajuste_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "lancamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      uploads: {
        Row: {
          arquivo_nome: string
          arquivo_path: string
          criado_em: string | null
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
          erros?: Json | null
          id?: string
          resumo?: Json | null
          status?: Database["public"]["Enums"]["upload_status"] | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          consultora_id: string | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          consultora_id?: string | null
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          consultora_id?: string | null
          created_at?: string | null
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
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_consultora_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
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
      app_role: "admin" | "consultora"
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
      operador_regra:
        | "contem"
        | "igual"
        | "comeca_com"
        | "termina_com"
        | "regex"
      regra_mes: "DATA_LANCAMENTO" | "DATA_INICIO" | "HIBRIDA"
      responsavel_campo: "resp_venda" | "resp_recebimento"
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
      app_role: ["admin", "consultora"],
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
      operador_regra: ["contem", "igual", "comeca_com", "termina_com", "regex"],
      regra_mes: ["DATA_LANCAMENTO", "DATA_INICIO", "HIBRIDA"],
      responsavel_campo: ["resp_venda", "resp_recebimento"],
      upload_status: ["enviado", "importando", "concluido", "erro"],
    },
  },
} as const
