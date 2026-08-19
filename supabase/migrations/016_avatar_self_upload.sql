-- ------------------------------------------------------------
-- Let a logged-in seller upload/replace their OWN avatar directly from the
-- browser (dashboard "Mis Datos"), unlike the register flow — which has no
-- session yet and goes through the service-role client instead. The
-- 'avatars' bucket is already public=true (014_username_and_avatar.sql),
-- but that flag only affects the public read URL; it does NOT grant the
-- JS SDK's upload()/update() calls access — those still go through
-- storage.objects RLS regardless of the bucket's public flag, so policies
-- are required here too.
--
-- Objects are stored at `${auth.uid()}/avatar.<ext>` (see register/route.ts
-- and dashboard/page.tsx) — storage.foldername(name)[1] is that first path
-- segment, scoping every policy to "only your own folder".
-- ------------------------------------------------------------

CREATE POLICY "avatars: owner can upload own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars: owner can update own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
