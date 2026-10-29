-- Immanent Lead Engine — online presence & message delivery receipts (idempotent)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
