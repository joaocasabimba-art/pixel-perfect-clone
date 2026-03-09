-- Create work_orders table
CREATE TABLE public.work_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  number serial NOT NULL,
  status text NOT NULL DEFAULT 'open',
  products_used jsonb DEFAULT '[]'::jsonb,
  areas_treated jsonb DEFAULT '[]'::jsonb,
  target_pests text[] DEFAULT '{}'::text[],
  tech_notes text,
  client_signature text,
  photos text[] DEFAULT '{}'::text[],
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT work_orders_status_check CHECK (status IN ('open', 'in_progress', 'done', 'cancelled'))
);

-- Add unique constraint on service_id (one WO per service)
ALTER TABLE public.work_orders ADD CONSTRAINT work_orders_service_id_key UNIQUE (service_id);

-- Enable RLS
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Company users can view work_orders" ON public.work_orders
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Company users can insert work_orders" ON public.work_orders
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Company users can update work_orders" ON public.work_orders
  FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id());

-- Add payment fields to services table if not exist
ALTER TABLE public.services 
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS started_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;

-- Create photos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true);

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photos');

CREATE POLICY "Anyone can view photos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'photos');

CREATE POLICY "Users can delete own photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'photos');