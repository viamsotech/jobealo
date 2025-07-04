-- Add reset token fields to users table
-- These fields will be used for password reset functionality

-- Add reset_token field (nullable, for storing password reset tokens)
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT;

-- Add reset_token_expiry field (nullable, for storing token expiration)
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP WITH TIME ZONE;

-- Add index for efficient token lookups
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token) WHERE reset_token IS NOT NULL;

-- Add index for efficient expiry cleanup
CREATE INDEX IF NOT EXISTS idx_users_reset_token_expiry ON users(reset_token_expiry) WHERE reset_token_expiry IS NOT NULL;

-- Verify the new columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('reset_token', 'reset_token_expiry');

-- Optional: Add a comment to document the purpose
COMMENT ON COLUMN users.reset_token IS 'Token used for password reset requests';
COMMENT ON COLUMN users.reset_token_expiry IS 'Expiration timestamp for reset token'; 