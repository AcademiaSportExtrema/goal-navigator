-- 1. Convert all HIBRIDA rules to DATA_LANCAMENTO
UPDATE public.regras_meta SET regra_mes = 'DATA_LANCAMENTO' WHERE regra_mes = 'HIBRIDA';

-- 2. Drop default, swap enum, restore default
ALTER TABLE public.regras_meta ALTER COLUMN regra_mes DROP DEFAULT;

ALTER TYPE public.regra_mes RENAME TO regra_mes_old;
CREATE TYPE public.regra_mes AS ENUM ('DATA_LANCAMENTO', 'DATA_INICIO');
ALTER TABLE public.regras_meta ALTER COLUMN regra_mes TYPE public.regra_mes USING regra_mes::text::public.regra_mes;
DROP TYPE public.regra_mes_old;

ALTER TABLE public.regras_meta ALTER COLUMN regra_mes SET DEFAULT 'DATA_LANCAMENTO'::regra_mes;