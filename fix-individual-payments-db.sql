-- Fix database for individual payments and 3 free downloads
-- Run this script in Supabase SQL Editor

-- 1. Update download_limits table to 3 free downloads
UPDATE download_limits 
SET free_spanish_limit = 3 
WHERE user_type IN ('ANONYMOUS', 'REGISTERED_FREEMIUM');

-- If no records exist, insert default values
INSERT INTO download_limits (user_type, free_spanish_limit, spanish_price, english_price, requires_registration)
VALUES 
  ('ANONYMOUS', 3, 1.99, 1.99, false),
  ('REGISTERED_FREEMIUM', 3, 1.99, 1.99, true),
  ('REGISTERED_PRO', -1, 0, 0, true),
  ('LIFETIME', -1, 0, 0, true)
ON CONFLICT (user_type) 
DO UPDATE SET 
  free_spanish_limit = EXCLUDED.free_spanish_limit,
  spanish_price = EXCLUDED.spanish_price,
  english_price = EXCLUDED.english_price,
  requires_registration = EXCLUDED.requires_registration;

-- 2. Fix individual_purchases table constraints
-- Drop existing restrictive constraints
ALTER TABLE individual_purchases DROP CONSTRAINT IF EXISTS individual_purchases_payment_type_check;
ALTER TABLE individual_purchases DROP CONSTRAINT IF EXISTS individual_purchases_plan_type_check;

-- Add new flexible constraints
ALTER TABLE individual_purchases 
ADD CONSTRAINT individual_purchases_payment_type_check 
CHECK (payment_type IN ('SUBSCRIPTION', 'LIFETIME', 'INDIVIDUAL_DOWNLOAD'));

-- Allow plan_type to be NULL for individual payments
ALTER TABLE individual_purchases 
ALTER COLUMN plan_type DROP NOT NULL;

-- Add constraint that allows NULL for individual payments
ALTER TABLE individual_purchases 
ADD CONSTRAINT individual_purchases_plan_type_check 
CHECK (
  (payment_type = 'INDIVIDUAL_DOWNLOAD' AND plan_type IS NULL) OR
  (payment_type IN ('SUBSCRIPTION', 'LIFETIME') AND plan_type IN ('PRO', 'LIFETIME'))
);

-- 3. Add metadata column for individual payments (JSONB for flexibility)
ALTER TABLE individual_purchases 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 4. Make user_id nullable for anonymous payments
ALTER TABLE individual_purchases 
ALTER COLUMN user_id DROP NOT NULL;

-- Add constraint that ensures either user_id exists OR it's an individual payment
-- (Individual payments can be made by anonymous users)
ALTER TABLE individual_purchases 
ADD CONSTRAINT user_or_individual_payment_check 
CHECK (
  user_id IS NOT NULL OR 
  payment_type = 'INDIVIDUAL_DOWNLOAD'
);

-- 5. Fix downloads table constraint to allow all download types
ALTER TABLE downloads DROP CONSTRAINT IF EXISTS downloads_download_type_check;
ALTER TABLE downloads 
ADD CONSTRAINT downloads_download_type_check 
CHECK (download_type IN (
  'FREE_SPANISH', 'PAID_SPANISH', 'PAID_ENGLISH', 
  'LIFETIME_SPANISH', 'LIFETIME_ENGLISH', 
  'PRO_SPANISH', 'PRO_ENGLISH',
  'FREE_ENGLISH'
));

-- 6. Add fingerprint_id to individual_purchases for anonymous tracking
ALTER TABLE individual_purchases 
ADD COLUMN IF NOT EXISTS fingerprint_id TEXT;

-- Add index for fingerprint lookups
CREATE INDEX IF NOT EXISTS idx_individual_purchases_fingerprint_id 
ON individual_purchases(fingerprint_id) 
WHERE fingerprint_id IS NOT NULL;

-- 7. Verify the changes
SELECT 'Database updates completed successfully' as status;

-- Show current download_limits
SELECT 'Download Limits:' as info, user_type, free_spanish_limit, spanish_price 
FROM download_limits ORDER BY user_type;

-- Show table structure for individual_purchases
SELECT 'Individual Purchases Table Structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'individual_purchases' 
ORDER BY ordinal_position; 