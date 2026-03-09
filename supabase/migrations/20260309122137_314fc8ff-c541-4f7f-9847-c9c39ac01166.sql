-- Reverter OS #0006 para 'open' para teste
UPDATE work_orders SET status = 'open', started_at = NULL, completed_at = NULL, updated_at = now() WHERE id = '9051fa77-ed49-44f2-a476-ecdd45c56d92';

-- Reverter o serviço associado para 'scheduled'
UPDATE services SET status = 'scheduled', started_at = NULL, completed_at = NULL WHERE id = '2906c8a4-091b-4a76-9d5c-47cc91af0a91';
