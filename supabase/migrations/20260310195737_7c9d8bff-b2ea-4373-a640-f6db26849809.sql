
-- Fix search_path for new functions
ALTER FUNCTION public.validate_proposal_status() SET search_path = public;
ALTER FUNCTION public.set_proposal_number() SET search_path = public;
