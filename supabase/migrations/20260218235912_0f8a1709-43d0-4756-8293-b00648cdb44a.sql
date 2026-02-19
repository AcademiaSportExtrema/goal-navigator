
-- Enums for ticket status and priority
CREATE TYPE public.ticket_status AS ENUM ('aberto', 'em_andamento', 'resolvido', 'fechado');
CREATE TYPE public.ticket_prioridade AS ENUM ('baixa', 'media', 'alta', 'urgente');

-- Support tickets table
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  created_by uuid NOT NULL,
  assunto text NOT NULL,
  descricao text NOT NULL,
  status public.ticket_status NOT NULL DEFAULT 'aberto',
  prioridade public.ticket_prioridade NOT NULL DEFAULT 'media',
  assigned_to uuid
);

-- Support messages table
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  mensagem text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at on tickets
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: support_tickets
-- Super admin sees all
CREATE POLICY "Super admins full access support_tickets"
  ON public.support_tickets FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Admin sees/creates tickets for own empresa
CREATE POLICY "Admins read own empresa tickets"
  ON public.support_tickets FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND empresa_id = public.get_user_empresa_id(auth.uid())
  );

CREATE POLICY "Admins create own empresa tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND empresa_id = public.get_user_empresa_id(auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Admins update own empresa tickets"
  ON public.support_tickets FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND empresa_id = public.get_user_empresa_id(auth.uid())
  );

-- RLS: support_messages
-- Super admin sees all
CREATE POLICY "Super admins full access support_messages"
  ON public.support_messages FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Admin sees non-internal messages for tickets in their empresa
CREATE POLICY "Admins read own empresa messages"
  ON public.support_messages FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND is_internal = false
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND t.empresa_id = public.get_user_empresa_id(auth.uid())
    )
  );

-- Admin can insert messages on own empresa tickets
CREATE POLICY "Admins create messages on own tickets"
  ON public.support_messages FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND user_id = auth.uid()
    AND is_internal = false
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND t.empresa_id = public.get_user_empresa_id(auth.uid())
    )
  );

-- Indexes
CREATE INDEX idx_support_tickets_empresa_id ON public.support_tickets(empresa_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_created_at ON public.support_tickets(created_at DESC);
CREATE INDEX idx_support_messages_ticket_id ON public.support_messages(ticket_id);
