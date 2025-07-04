-- Fix plan constraint to allow PRO and LIFETIME plans
-- Drop existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_plan_check;

-- Add new constraint with all allowed plans
ALTER TABLE users ADD CONSTRAINT users_plan_check 
CHECK (plan IN ('FREEMIUM', 'PRO', 'LIFETIME'));

-- Verify the constraint
\d+ users; 