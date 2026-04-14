ALTER TABLE "PROFILE"
  ADD COLUMN IF NOT EXISTS "DRIVER_LICENSE_URL" text,
  ADD COLUMN IF NOT EXISTS "DRIVER_OR_CR_URL" text;

ALTER TABLE "VEHICLE"
  ADD COLUMN IF NOT EXISTS "REGISTRATION_DOC_URL" text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('driver-documents', 'driver-documents', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-documents', 'vehicle-documents', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "driver_docs_public_read" ON storage.objects;
CREATE POLICY "driver_docs_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'driver-documents');

DROP POLICY IF EXISTS "driver_docs_insert_own" ON storage.objects;
CREATE POLICY "driver_docs_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'driver-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "driver_docs_update_own" ON storage.objects;
CREATE POLICY "driver_docs_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'driver-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'driver-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "vehicle_docs_public_read" ON storage.objects;
CREATE POLICY "vehicle_docs_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'vehicle-documents');

DROP POLICY IF EXISTS "vehicle_docs_insert_own" ON storage.objects;
CREATE POLICY "vehicle_docs_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'vehicle-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "vehicle_docs_update_own" ON storage.objects;
CREATE POLICY "vehicle_docs_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'vehicle-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'vehicle-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := upper(coalesce(new.raw_user_meta_data->>'role', 'USER'));
BEGIN
  INSERT INTO public."PROFILE" (
    "ID",
    "ROLE",
    "FULL_NAME",
    "PHONE_NUMBER",
    "EMAIL",
    "IS_APPROVED"
  )
  VALUES (
    new.id,
    CASE WHEN v_role = 'DRIVER' THEN 'DRIVER' ELSE 'USER' END,
    coalesce(new.raw_user_meta_data->>'name', 'No Name'),
    coalesce(new.raw_user_meta_data->>'phone_number', 'No Phone'),
    new.email,
    CASE WHEN v_role = 'DRIVER' THEN false ELSE true END
  );
  RETURN new;
END;
$$;
