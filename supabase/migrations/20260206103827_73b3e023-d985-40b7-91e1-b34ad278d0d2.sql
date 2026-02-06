-- Enum para papéis de usuário
CREATE TYPE public.app_role AS ENUM ('admin', 'consultora');

-- Enum para status de upload
CREATE TYPE public.upload_status AS ENUM ('enviado', 'importando', 'concluido', 'erro');

-- Enum para campos alvo das regras
CREATE TYPE public.campo_alvo AS ENUM ('produto', 'plano', 'modalidades', 'forma_pagamento', 'condicao_pagamento', 'empresa', 'situacao_contrato', 'resp_venda', 'resp_recebimento');

-- Enum para operadores de regra
CREATE TYPE public.operador_regra AS ENUM ('contem', 'igual', 'comeca_com', 'termina_com', 'regex');

-- Enum para campo de responsável
CREATE TYPE public.responsavel_campo AS ENUM ('resp_venda', 'resp_recebimento');

-- Enum para regra de mês
CREATE TYPE public.regra_mes AS ENUM ('DATA_LANCAMENTO', 'DATA_INICIO', 'HIBRIDA');

-- Tabela de papéis de usuário (segue as instruções de segurança)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    consultora_id UUID NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Tabela de consultoras
CREATE TABLE public.consultoras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    email TEXT UNIQUE,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Adicionar FK após criar a tabela consultoras
ALTER TABLE public.user_roles 
ADD CONSTRAINT fk_user_roles_consultora 
FOREIGN KEY (consultora_id) REFERENCES public.consultoras(id) ON DELETE SET NULL;

-- Tabela de uploads
CREATE TABLE public.uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    arquivo_path TEXT NOT NULL,
    arquivo_nome TEXT NOT NULL,
    status upload_status DEFAULT 'enviado',
    resumo JSONB DEFAULT '{}',
    erros JSONB DEFAULT '[]'
);

-- Tabela de lançamentos (100% do Excel)
CREATE TABLE public.lancamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_id UUID REFERENCES public.uploads(id) ON DELETE CASCADE NOT NULL,
    produto TEXT,
    matricula TEXT,
    nome_cliente TEXT,
    resp_venda TEXT,
    resp_recebimento TEXT,
    data_cadastro DATE,
    numero_contrato TEXT,
    data_inicio DATE,
    data_termino DATE,
    duracao TEXT,
    modalidades TEXT,
    turmas TEXT,
    categoria TEXT,
    plano TEXT,
    situacao_contrato TEXT,
    data_lancamento DATE,
    forma_pagamento TEXT,
    condicao_pagamento TEXT,
    valor DECIMAL(15, 2) DEFAULT 0,
    empresa TEXT,
    -- Campos de classificação para META
    entra_meta BOOLEAN DEFAULT false,
    pendente_regra BOOLEAN DEFAULT true,
    consultora_chave TEXT,
    mes_competencia TEXT,
    regra_aplicada_id UUID,
    motivo_classificacao TEXT,
    -- Hash para deduplicação
    hash_linha TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de regras do motor de meta
CREATE TABLE public.regras_meta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ativo BOOLEAN DEFAULT true,
    prioridade INTEGER NOT NULL,
    campo_alvo campo_alvo NOT NULL,
    operador operador_regra NOT NULL,
    valor TEXT NOT NULL,
    entra_meta BOOLEAN NOT NULL,
    responsavel_campo responsavel_campo DEFAULT 'resp_venda',
    regra_mes regra_mes DEFAULT 'DATA_LANCAMENTO',
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- FK para regra aplicada
ALTER TABLE public.lancamentos 
ADD CONSTRAINT fk_lancamentos_regra 
FOREIGN KEY (regra_aplicada_id) REFERENCES public.regras_meta(id) ON DELETE SET NULL;

-- Tabela de metas mensais
CREATE TABLE public.metas_mensais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mes_referencia TEXT UNIQUE NOT NULL,
    meta_total DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de metas por consultora
CREATE TABLE public.metas_consultoras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meta_mensal_id UUID REFERENCES public.metas_mensais(id) ON DELETE CASCADE NOT NULL,
    consultora_id UUID REFERENCES public.consultoras(id) ON DELETE CASCADE NOT NULL,
    percentual DECIMAL(5, 4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (meta_mensal_id, consultora_id)
);

-- Tabela de níveis de comissão
CREATE TABLE public.comissao_niveis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meta_mensal_id UUID REFERENCES public.metas_mensais(id) ON DELETE CASCADE NOT NULL,
    nivel INTEGER NOT NULL CHECK (nivel >= 1 AND nivel <= 5),
    de_percent DECIMAL(5, 4) NOT NULL,
    ate_percent DECIMAL(5, 4) NOT NULL,
    comissao_percent DECIMAL(5, 4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (meta_mensal_id, nivel)
);

-- Função de segurança para verificar papel do usuário
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para obter consultora_id do usuário
CREATE OR REPLACE FUNCTION public.get_user_consultora_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT consultora_id
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regras_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas_mensais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas_consultoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comissao_niveis ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para consultoras
CREATE POLICY "Everyone can view consultoras"
ON public.consultoras FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage consultoras"
ON public.consultoras FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para uploads
CREATE POLICY "Admins can view all uploads"
ON public.uploads FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

CREATE POLICY "Authenticated users can create uploads"
ON public.uploads FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage uploads"
ON public.uploads FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para lancamentos
CREATE POLICY "Admins can view all lancamentos"
ON public.lancamentos FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Consultoras can view their lancamentos"
ON public.lancamentos FOR SELECT
TO authenticated
USING (
  consultora_chave IN (
    SELECT nome FROM public.consultoras WHERE id = public.get_user_consultora_id(auth.uid())
  )
);

CREATE POLICY "Admins can manage lancamentos"
ON public.lancamentos FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para regras_meta
CREATE POLICY "Admins can view regras"
ON public.regras_meta FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage regras"
ON public.regras_meta FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para metas_mensais
CREATE POLICY "Everyone can view metas_mensais"
ON public.metas_mensais FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage metas_mensais"
ON public.metas_mensais FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para metas_consultoras
CREATE POLICY "Users can view relevant metas_consultoras"
ON public.metas_consultoras FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  consultora_id = public.get_user_consultora_id(auth.uid())
);

CREATE POLICY "Admins can manage metas_consultoras"
ON public.metas_consultoras FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para comissao_niveis
CREATE POLICY "Everyone can view comissao_niveis"
ON public.comissao_niveis FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage comissao_niveis"
ON public.comissao_niveis FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_consultoras_updated_at
    BEFORE UPDATE ON public.consultoras
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_regras_meta_updated_at
    BEFORE UPDATE ON public.regras_meta
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_metas_mensais_updated_at
    BEFORE UPDATE ON public.metas_mensais
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_lancamentos_upload_id ON public.lancamentos(upload_id);
CREATE INDEX idx_lancamentos_mes_competencia ON public.lancamentos(mes_competencia);
CREATE INDEX idx_lancamentos_consultora_chave ON public.lancamentos(consultora_chave);
CREATE INDEX idx_lancamentos_entra_meta ON public.lancamentos(entra_meta);
CREATE INDEX idx_lancamentos_pendente_regra ON public.lancamentos(pendente_regra);
CREATE INDEX idx_lancamentos_hash_linha ON public.lancamentos(hash_linha);
CREATE INDEX idx_regras_meta_prioridade ON public.regras_meta(prioridade);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- Criar bucket para storage dos arquivos Excel
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', false);

-- Políticas de storage
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'uploads');

CREATE POLICY "Users can view their own uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'uploads');

CREATE POLICY "Admins can manage all files"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'uploads' AND public.has_role(auth.uid(), 'admin'));