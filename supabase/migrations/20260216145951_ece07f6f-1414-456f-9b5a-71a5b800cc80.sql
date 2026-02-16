-- Fix 1: Storage policy - restrict to empresa-scoped access
DROP POLICY IF EXISTS "Users can view their own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;

CREATE POLICY "Users can view empresa uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'uploads' AND (
    (storage.foldername(name))[1] IN (
      SELECT empresa_id::text FROM public.user_roles WHERE user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);

CREATE POLICY "Users can upload to empresa folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads' AND (
    (storage.foldername(name))[1] IN (
      SELECT empresa_id::text FROM public.user_roles WHERE user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);

-- Fix 2: Drop dangerous auto-admin trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_role();