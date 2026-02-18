
-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid NOT NULL,
  actor_email text,
  actor_role public.app_role,
  empresa_id uuid REFERENCES public.empresas(id),
  action text NOT NULL,
  target_table text,
  target_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Super admin sees all logs
CREATE POLICY "Super admins read all audit_logs"
ON public.audit_logs FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Admin sees only own empresa logs
CREATE POLICY "Admins read own empresa audit_logs"
ON public.audit_logs FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND empresa_id = public.get_user_empresa_id(auth.uid())
);

-- Authenticated users can insert (edge functions need this)
CREATE POLICY "Authenticated insert audit_logs"
ON public.audit_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Index for common queries
CREATE INDEX idx_audit_logs_empresa_id ON public.audit_logs(empresa_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
