-- Create individual_purchases table for tracking Stripe payments
-- This version handles potential conflicts and edge cases

-- Drop table if it exists (optional - only if you want to start fresh)
-- DROP TABLE IF EXISTS individual_purchases;

-- Create the table
CREATE TABLE IF NOT EXISTS individual_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stripe_session_id TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  payment_type VARCHAR(20) NOT NULL,
  plan_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint (if table already exists, this will be skipped)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'individual_purchases_user_id_fkey'
  ) THEN
    ALTER TABLE individual_purchases 
    ADD CONSTRAINT individual_purchases_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add check constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'individual_purchases_payment_type_check'
  ) THEN
    ALTER TABLE individual_purchases 
    ADD CONSTRAINT individual_purchases_payment_type_check 
    CHECK (payment_type IN ('SUBSCRIPTION', 'LIFETIME'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'individual_purchases_plan_type_check'
  ) THEN
    ALTER TABLE individual_purchases 
    ADD CONSTRAINT individual_purchases_plan_type_check 
    CHECK (plan_type IN ('PRO', 'LIFETIME'));
  END IF;
END $$;

-- Add unique constraint on stripe_session_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_stripe_session_id'
  ) THEN
    ALTER TABLE individual_purchases 
    ADD CONSTRAINT unique_stripe_session_id 
    UNIQUE (stripe_session_id);
  END IF;
END $$;

-- Add indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_individual_purchases_user_id ON individual_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_individual_purchases_stripe_session_id ON individual_purchases(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_individual_purchases_created_at ON individual_purchases(created_at);
CREATE INDEX IF NOT EXISTS idx_individual_purchases_plan_type ON individual_purchases(plan_type);

-- Create or replace the updated_at function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at trigger (drop first if exists)
DROP TRIGGER IF EXISTS update_individual_purchases_updated_at ON individual_purchases;
CREATE TRIGGER update_individual_purchases_updated_at 
  BEFORE UPDATE ON individual_purchases 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify the table was created successfully
SELECT 
  'Table created successfully' as message,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'individual_purchases';

-- Show table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'individual_purchases' 
ORDER BY ordinal_position; 