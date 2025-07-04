-- Fix and standardize individual_purchases table schema
-- Run this in Supabase SQL Editor

-- 1. First, let's see what we're working with
SELECT 'Current table structure before cleanup:' as info;

-- 2. Drop old constraints that might conflict
ALTER TABLE individual_purchases DROP CONSTRAINT IF EXISTS individual_purchases_purchase_type_check;
ALTER TABLE individual_purchases DROP CONSTRAINT IF EXISTS individual_purchases_payment_type_check;
ALTER TABLE individual_purchases DROP CONSTRAINT IF EXISTS individual_purchases_plan_type_check;
ALTER TABLE individual_purchases DROP CONSTRAINT IF EXISTS user_or_individual_payment_check;

-- 3. If payment_type is empty but purchase_type has data, migrate it
UPDATE individual_purchases 
SET payment_type = 
  CASE 
    WHEN purchase_type = 'SPANISH_DOWNLOAD' THEN 'INDIVIDUAL_DOWNLOAD'
    WHEN purchase_type = 'ENGLISH_DOWNLOAD' THEN 'INDIVIDUAL_DOWNLOAD'
    WHEN purchase_type = 'LIFETIME_PLAN' THEN 'LIFETIME'
    ELSE purchase_type
  END
WHERE payment_type IS NULL AND purchase_type IS NOT NULL;

-- 4. Drop the old purchase_type column (we're using payment_type now)
ALTER TABLE individual_purchases DROP COLUMN IF EXISTS purchase_type;

-- 5. Make sure we have the right constraints for payment_type
ALTER TABLE individual_purchases 
ADD CONSTRAINT individual_purchases_payment_type_check 
CHECK (payment_type IN ('SUBSCRIPTION', 'LIFETIME', 'INDIVIDUAL_DOWNLOAD'));

-- 6. Fix plan_type constraint (allow NULL for individual downloads)
ALTER TABLE individual_purchases 
ADD CONSTRAINT individual_purchases_plan_type_check 
CHECK (
  (payment_type = 'INDIVIDUAL_DOWNLOAD' AND plan_type IS NULL) OR
  (payment_type IN ('SUBSCRIPTION', 'LIFETIME') AND plan_type IN ('PRO', 'LIFETIME'))
);

-- 7. Ensure user_id can be NULL for anonymous payments
ALTER TABLE individual_purchases 
ADD CONSTRAINT user_or_individual_payment_check 
CHECK (
  user_id IS NOT NULL OR 
  payment_type = 'INDIVIDUAL_DOWNLOAD'
);

-- 8. Set NOT NULL constraints where appropriate
ALTER TABLE individual_purchases ALTER COLUMN payment_type SET NOT NULL;
ALTER TABLE individual_purchases ALTER COLUMN amount SET NOT NULL;

-- 9. Add useful indexes
CREATE INDEX IF NOT EXISTS idx_individual_purchases_payment_type ON individual_purchases(payment_type);
CREATE INDEX IF NOT EXISTS idx_individual_purchases_user_id ON individual_purchases(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_individual_purchases_created_at ON individual_purchases(created_at);

-- 10. Update download_limits to 3 free downloads
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

-- 11. Fix downloads table constraint to allow all download types
ALTER TABLE downloads DROP CONSTRAINT IF EXISTS downloads_download_type_check;
ALTER TABLE downloads 
ADD CONSTRAINT downloads_download_type_check 
CHECK (download_type IN (
  'FREE_SPANISH', 'PAID_SPANISH', 'PAID_ENGLISH', 
  'LIFETIME_SPANISH', 'LIFETIME_ENGLISH', 
  'PRO_SPANISH', 'PRO_ENGLISH',
  'FREE_ENGLISH'
));

-- 12. Verification queries
SELECT 'Schema cleanup completed successfully!' as status;

SELECT 'Updated Download Limits:' as info;
SELECT user_type, free_spanish_limit, spanish_price, english_price 
FROM download_limits ORDER BY user_type;

SELECT 'Final individual_purchases structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'individual_purchases' 
ORDER BY ordinal_position;

SELECT 'Current constraints:' as info;
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'individual_purchases'; 