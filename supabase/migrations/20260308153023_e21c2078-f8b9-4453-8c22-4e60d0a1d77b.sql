ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS address jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS quote_value numeric DEFAULT NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) DEFAULT NULL;