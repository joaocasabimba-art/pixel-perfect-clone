
-- 1. Companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT,
  responsible_tech TEXT,
  crq_crea TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  origin TEXT DEFAULT 'manual',
  service_type TEXT,
  location TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','quoted','negotiating','won','lost')),
  last_action TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  document TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  tags TEXT[] DEFAULT '{}',
  lead_id UUID REFERENCES public.leads(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Services table
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id),
  assigned_to UUID REFERENCES public.profiles(id),
  service_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  scheduled_date DATE,
  start_time TIME,
  end_time TIME,
  address TEXT,
  value NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Products (estoque) table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT DEFAULT 'un',
  stock NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_stock NUMERIC(10,2) DEFAULT 0,
  cost NUMERIC(10,2) DEFAULT 0,
  supplier TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Reports (laudos) table
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id),
  client_id UUID REFERENCES public.clients(id),
  tech_id UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','signed','sent')),
  validity_date DATE,
  content JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Recurrences table
CREATE TABLE public.recurrences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  interval_months INT NOT NULL DEFAULT 6,
  last_service_date DATE,
  next_service_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurrences ENABLE ROW LEVEL SECURITY;

-- Helper function: get user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid()
$$;

-- RLS Policies for companies
CREATE POLICY "Users can view own company" ON public.companies
  FOR SELECT TO authenticated
  USING (id = public.get_user_company_id());

CREATE POLICY "Users can update own company" ON public.companies
  FOR UPDATE TO authenticated
  USING (id = public.get_user_company_id());

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- RLS Policies for leads (scoped by company_id)
CREATE POLICY "Company users can view leads" ON public.leads
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Company users can insert leads" ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Company users can update leads" ON public.leads
  FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Company users can delete leads" ON public.leads
  FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id());

-- RLS Policies for clients
CREATE POLICY "Company users can view clients" ON public.clients
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Company users can insert clients" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Company users can update clients" ON public.clients
  FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id());

-- RLS Policies for services
CREATE POLICY "Company users can view services" ON public.services
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Company users can insert services" ON public.services
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Company users can update services" ON public.services
  FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id());

-- RLS Policies for products
CREATE POLICY "Company users can view products" ON public.products
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Company users can insert products" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Company users can update products" ON public.products
  FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id());

-- RLS Policies for reports
CREATE POLICY "Company users can view reports" ON public.reports
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Company users can insert reports" ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Company users can update reports" ON public.reports
  FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id());

-- RLS Policies for recurrences
CREATE POLICY "Company users can view recurrences" ON public.recurrences
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Company users can insert recurrences" ON public.recurrences
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Company users can update recurrences" ON public.recurrences
  FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id());

-- Allow companies INSERT for new signups (no company_id yet)
CREATE POLICY "Authenticated users can create companies" ON public.companies
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
