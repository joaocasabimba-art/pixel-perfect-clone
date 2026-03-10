
-- 1. Create reports storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for reports bucket
CREATE POLICY "auth_upload_reports_20260310" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'reports');

CREATE POLICY "auth_read_reports_20260310" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'reports');

CREATE POLICY "auth_update_reports_20260310" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'reports');

-- 2. Add installments column to services
ALTER TABLE services ADD COLUMN IF NOT EXISTS installments jsonb DEFAULT '[]';

-- 3. Add attachments column to work_orders
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]';

-- 4. Create proposals table
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies ON DELETE CASCADE,
  client_id UUID REFERENCES clients ON DELETE SET NULL,
  lead_id UUID REFERENCES leads ON DELETE SET NULL,
  number INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  valid_until DATE,
  items JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  discount NUMERIC(10,2) DEFAULT 0,
  total_value NUMERIC(10,2),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation trigger for proposal status (no CHECK constraint)
CREATE OR REPLACE FUNCTION public.validate_proposal_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status NOT IN ('draft', 'sent', 'accepted', 'rejected') THEN
    RAISE EXCEPTION 'Invalid proposal status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_validate_proposal_status') THEN
    CREATE TRIGGER trg_validate_proposal_status
    BEFORE INSERT OR UPDATE ON proposals
    FOR EACH ROW EXECUTE FUNCTION public.validate_proposal_status();
  END IF;
END; $$;

-- Auto-number proposals per company
CREATE OR REPLACE FUNCTION public.set_proposal_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT COALESCE(MAX(number), 0) + 1 INTO NEW.number
  FROM proposals WHERE company_id = NEW.company_id;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_proposal_number') THEN
    CREATE TRIGGER trg_proposal_number
    BEFORE INSERT ON proposals
    FOR EACH ROW EXECUTE FUNCTION public.set_proposal_number();
  END IF;
END; $$;

-- RLS for proposals
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposals_select" ON proposals
FOR SELECT TO authenticated USING (company_id = get_user_company_id());

CREATE POLICY "proposals_insert" ON proposals
FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "proposals_update" ON proposals
FOR UPDATE TO authenticated USING (company_id = get_user_company_id());

CREATE POLICY "proposals_delete" ON proposals
FOR DELETE TO authenticated USING (company_id = get_user_company_id());
