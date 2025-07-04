-- Create individual_purchases table for tracking Stripe payments
-- This table is used by the Stripe webhook to record all purchases

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS individual_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_session_id TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('SUBSCRIPTION', 'LIFETIME')),
  plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('PRO', 'LIFETIME')),
  status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_individual_purchases_user_id ON individual_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_individual_purchases_stripe_session_id ON individual_purchases(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_individual_purchases_created_at ON individual_purchases(created_at);
CREATE INDEX IF NOT EXISTS idx_individual_purchases_plan_type ON individual_purchases(plan_type);

-- Add unique constraint on stripe_session_id to prevent duplicate entries
ALTER TABLE individual_purchases ADD CONSTRAINT unique_stripe_session_id UNIQUE (stripe_session_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_individual_purchases_updated_at 
  BEFORE UPDATE ON individual_purchases 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments to document the table structure
COMMENT ON TABLE individual_purchases IS 'Records all individual purchases from Stripe';
COMMENT ON COLUMN individual_purchases.stripe_session_id IS 'Stripe checkout session ID';
COMMENT ON COLUMN individual_purchases.amount IS 'Amount paid in dollars';
COMMENT ON COLUMN individual_purchases.payment_type IS 'Type of payment: SUBSCRIPTION or LIFETIME';
COMMENT ON COLUMN individual_purchases.plan_type IS 'Plan purchased: PRO or LIFETIME';

-- Verify the table was created
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'individual_purchases' 
ORDER BY ordinal_position; 