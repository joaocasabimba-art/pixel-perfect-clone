
DROP POLICY "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    company_id IS NOT DISTINCT FROM (
      SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid()
    ) AND
    role IS NOT DISTINCT FROM (
      SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()
    )
  );
