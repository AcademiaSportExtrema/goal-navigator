
CREATE TABLE public.system_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins full access" ON public.system_settings
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));
