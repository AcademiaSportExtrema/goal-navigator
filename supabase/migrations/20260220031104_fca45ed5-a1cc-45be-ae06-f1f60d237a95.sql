
ALTER TABLE public.empresas ADD COLUMN logo_url text;

INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);

CREATE POLICY "Super admins manage logos"
ON storage.objects FOR ALL
USING (bucket_id = 'logos' AND has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (bucket_id = 'logos' AND has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins upload own empresa logo"
ON storage.objects FOR ALL
USING (bucket_id = 'logos' AND has_role(auth.uid(), 'admin'::app_role) AND (storage.foldername(name))[1] = get_user_empresa_id(auth.uid())::text)
WITH CHECK (bucket_id = 'logos' AND has_role(auth.uid(), 'admin'::app_role) AND (storage.foldername(name))[1] = get_user_empresa_id(auth.uid())::text);

CREATE POLICY "Public read logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');
