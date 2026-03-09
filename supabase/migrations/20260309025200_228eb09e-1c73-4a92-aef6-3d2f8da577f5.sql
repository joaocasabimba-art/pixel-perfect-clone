
-- Stock movements table for tracking inventory changes
CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  type text NOT NULL DEFAULT 'in', -- 'in' or 'out'
  qty numeric NOT NULL DEFAULT 0,
  unit_cost numeric,
  work_order_id uuid REFERENCES public.work_orders(id),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view stock_movements"
  ON public.stock_movements FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Company users can insert stock_movements"
  ON public.stock_movements FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id());
