-- Simple version - Create individual_purchases table for Stripe payments
-- This is the minimum required for the Stripe integration to work

CREATE TABLE IF NOT EXISTS individual_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stripe_session_id TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_type VARCHAR(20) NOT NULL,
  plan_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'COMPLETED',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add basic indexes
CREATE INDEX IF NOT EXISTS idx_individual_purchases_user_id ON individual_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_individual_purchases_stripe_session_id ON individual_purchases(stripe_session_id);

-- Check if table was created
SELECT 'individual_purchases table created successfully' as status; 