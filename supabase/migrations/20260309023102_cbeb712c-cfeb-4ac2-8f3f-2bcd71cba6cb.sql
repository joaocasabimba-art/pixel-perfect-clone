-- Add notes column to clients table for annotations
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS notes jsonb DEFAULT '[]'::jsonb;

-- Add signed_at, sent_at, responsible_tech, rt_registry to reports
ALTER TABLE public.reports 
  ADD COLUMN IF NOT EXISTS signed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS sent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS responsible_tech text,
  ADD COLUMN IF NOT EXISTS rt_registry text;