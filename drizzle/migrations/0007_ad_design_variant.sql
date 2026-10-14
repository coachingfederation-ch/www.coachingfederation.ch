ALTER TABLE public.ad_requests ADD COLUMN IF NOT EXISTS design_variant text NOT NULL DEFAULT 'editorial';
ALTER TABLE public.ad_requests ADD CONSTRAINT ad_requests_design_variant_check CHECK (design_variant IN ('editorial','spotlight','warm'));
ALTER TABLE public.ad_placements ADD COLUMN IF NOT EXISTS design_variant text NOT NULL DEFAULT 'editorial';
ALTER TABLE public.ad_placements ADD CONSTRAINT ad_placements_design_variant_check CHECK (design_variant IN ('editorial','spotlight','warm'));