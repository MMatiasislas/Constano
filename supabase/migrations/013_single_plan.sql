-- Pasa el modelo de precios de 3 planes (Basic/Pro/Max) a un solo plan con
-- tope de 100 alumnos. Por encima de eso, el gym deriva al plan Custom
-- (contacto por WhatsApp, no hay fila en esta tabla para Custom).
--
-- No se borran 'basic'/'max': quedan en el catálogo pero inactivos, por si
-- algún gym viejo los tiene referenciados en gym_subscriptions.current_plan_id
-- y para poder revertir fácil si hace falta.
update public.subscription_plans set active = false where id in ('basic', 'max');

-- El plan que queda activo pasa a ser "el" plan único de Constano.
-- max_members ya estaba en 100 para 'pro' (no cambia de valor), se deja el
-- update igual para que quede explícito y a prueba de que alguien lo haya
-- tocado a mano en Supabase. price_ars sí cambia: el plan único es $30.000,
-- no el precio viejo del plan "Pro" ($50.000).
update public.subscription_plans
  set name = 'Constano', price_ars = 30000, max_members = 100
  where id = 'pro';
