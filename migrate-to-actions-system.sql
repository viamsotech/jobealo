-- Migrate from Downloads to Actions System
-- Run this in Supabase SQL Editor

-- 1. Create new user_actions table
CREATE TABLE IF NOT EXISTS user_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_id TEXT,
  user_id TEXT,
  action_type TEXT NOT NULL,
  details JSONB, -- For storing action-specific data
  amount_paid DECIMAL DEFAULT 0,
  stripe_payment_intent_id TEXT,
  stripe_session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add constraints for action_type
ALTER TABLE user_actions 
ADD CONSTRAINT user_actions_action_type_check 
CHECK (action_type IN (
  'DOWNLOAD_SPANISH', 
  'DOWNLOAD_ENGLISH', 
  'TRANSLATE_TO_ENGLISH',
  'GENERATE_EMAIL',
  'GENERATE_COVER_LETTER', 
  'ADAPT_CV'
));

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_actions_fingerprint_id ON user_actions(fingerprint_id) WHERE fingerprint_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_actions_user_id ON user_actions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_actions_action_type ON user_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_user_actions_created_at ON user_actions(created_at);

-- 4. Migrate existing downloads to actions
INSERT INTO user_actions (fingerprint_id, user_id, action_type, amount_paid, stripe_payment_intent_id, created_at)
SELECT 
  fingerprint_id,
  user_id,
  CASE 
    WHEN download_type LIKE '%SPANISH%' THEN 'DOWNLOAD_SPANISH'
    WHEN download_type LIKE '%ENGLISH%' THEN 'DOWNLOAD_ENGLISH'
    ELSE 'DOWNLOAD_SPANISH'
  END as action_type,
  amount_paid,
  stripe_payment_intent_id,
  created_at
FROM downloads;

-- 5. Update download_limits table to action_limits
-- Rename columns
ALTER TABLE download_limits RENAME COLUMN free_spanish_limit TO free_action_limit;
ALTER TABLE download_limits RENAME COLUMN spanish_price TO action_price;
ALTER TABLE download_limits DROP COLUMN IF EXISTS english_price;

-- Update values to reflect action-based system
UPDATE download_limits 
SET 
  free_action_limit = 3,
  action_price = 1.99
WHERE user_type IN ('ANONYMOUS', 'REGISTERED_FREEMIUM');

-- 6. Rename table for clarity
ALTER TABLE download_limits RENAME TO action_limits;

-- 7. Create view for backward compatibility (temporary)
CREATE OR REPLACE VIEW download_limits AS 
SELECT 
  id,
  user_type,
  free_action_limit as free_spanish_limit,
  action_price as spanish_price,
  action_price as english_price,
  requires_registration,
  created_at,
  updated_at
FROM action_limits;

-- 8. Create function to count user actions
CREATE OR REPLACE FUNCTION count_user_actions(
  p_fingerprint_id TEXT,
  p_user_id TEXT DEFAULT NULL
) RETURNS INT AS $$
DECLARE
  action_count INT;
BEGIN
  SELECT COUNT(*) INTO action_count
  FROM user_actions 
  WHERE 
    (fingerprint_id = p_fingerprint_id OR user_id = p_user_id)
    AND amount_paid = 0; -- Only count free actions
  
  RETURN COALESCE(action_count, 0);
END;
$$ LANGUAGE plpgsql;

-- 9. Create function to check if user can perform action
CREATE OR REPLACE FUNCTION can_perform_action(
  p_fingerprint_id TEXT,
  p_user_id TEXT DEFAULT NULL,
  p_action_type TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  user_type_val TEXT;
  action_limit INT;
  current_actions INT;
  result JSONB;
BEGIN
  -- Determine user type
  IF p_user_id IS NOT NULL THEN
    SELECT plan INTO user_type_val FROM users WHERE id = p_user_id;
    IF user_type_val = 'PRO' THEN
      user_type_val := 'REGISTERED_PRO';
    ELSIF user_type_val = 'LIFETIME' THEN
      user_type_val := 'LIFETIME';
    ELSE
      user_type_val := 'REGISTERED_FREEMIUM';
    END IF;
  ELSE
    user_type_val := 'ANONYMOUS';
  END IF;

  -- Get action limit
  SELECT free_action_limit INTO action_limit 
  FROM action_limits 
  WHERE user_type = user_type_val;

  -- Count current actions
  current_actions := count_user_actions(p_fingerprint_id, p_user_id);

  -- Check limits
  IF user_type_val IN ('REGISTERED_PRO', 'LIFETIME') THEN
    result := jsonb_build_object(
      'allowed', true,
      'remaining', -1,
      'requires_payment', false,
      'user_type', user_type_val,
      'current_actions', current_actions
    );
  ELSIF current_actions < action_limit THEN
    result := jsonb_build_object(
      'allowed', true,
      'remaining', action_limit - current_actions,
      'requires_payment', false,
      'user_type', user_type_val,
      'current_actions', current_actions
    );
  ELSE
    result := jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'requires_payment', true,
      'price', 1.99,
      'user_type', user_type_val,
      'current_actions', current_actions
    );
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 10. Verification
SELECT 'Migration completed successfully!' as status;

SELECT 'Action Limits:' as info;
SELECT user_type, free_action_limit, action_price 
FROM action_limits ORDER BY user_type;

SELECT 'Migrated Actions Count:' as info;
SELECT action_type, COUNT(*) as count 
FROM user_actions 
GROUP BY action_type;

-- Test the function
SELECT 'Function Test:' as info;
SELECT can_perform_action('test_fingerprint', NULL, 'DOWNLOAD_SPANISH') as test_result; 