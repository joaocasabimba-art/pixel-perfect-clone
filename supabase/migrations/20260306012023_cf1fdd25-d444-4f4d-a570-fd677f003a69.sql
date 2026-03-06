
-- Confirm the existing test user so they can login
UPDATE auth.users 
SET email_confirmed_at = now()
WHERE email = 'teste@teste.com';

-- Create a company for this user
INSERT INTO public.companies (id, name, cnpj, phone)
VALUES ('a0000000-0000-0000-0000-000000000001', 'Empresa Teste', null, null)
ON CONFLICT (id) DO NOTHING;

-- Update their profile with the company
UPDATE public.profiles 
SET company_id = 'a0000000-0000-0000-0000-000000000001', 
    full_name = 'Bruno'
WHERE id = 'dbd934ec-8732-4fe4-8c76-5df21d5e2fe9';
