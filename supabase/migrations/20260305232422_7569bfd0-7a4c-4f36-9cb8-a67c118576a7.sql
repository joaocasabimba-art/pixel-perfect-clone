
-- Fix: restrict companies insert to only allow if user has no company yet
DROP POLICY "Authenticated users can create companies" ON public.companies;
CREATE POLICY "Users without company can create one" ON public.companies
  FOR INSERT TO authenticated
  WITH CHECK (
    NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND company_id IS NOT NULL)
  );
