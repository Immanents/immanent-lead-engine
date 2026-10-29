-- Immanent Lead Engine — extra online-presence channels on leads (idempotent)
-- NULL means "nil" (not available)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS x_handle text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS discord  text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS telegram text;
