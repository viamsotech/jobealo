-- Script final para crear tablas de aplicaciones con tipos correctos

-- Create application_emails table
CREATE TABLE IF NOT EXISTS application_emails (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  cv_id TEXT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  job_description TEXT NOT NULL,
  formality VARCHAR(50) NOT NULL CHECK (formality IN ('informal', 'semi-formal', 'formal', 'neutral')),
  personality VARCHAR(50) NOT NULL CHECK (personality IN ('amigable', 'persuasivo', 'inspirador', 'profesional')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create cover_letters table
CREATE TABLE IF NOT EXISTS cover_letters (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  cv_id TEXT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  job_description TEXT NOT NULL,
  formality VARCHAR(50) NOT NULL CHECK (formality IN ('informal', 'semi-formal', 'formal', 'neutral')),
  personality VARCHAR(50) NOT NULL CHECK (personality IN ('amigable', 'persuasivo', 'inspirador', 'profesional')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraints
ALTER TABLE application_emails 
ADD CONSTRAINT fk_application_emails_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE cover_letters 
ADD CONSTRAINT fk_cover_letters_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_application_emails_user_id ON application_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_application_emails_cv_id ON application_emails(cv_id);
CREATE INDEX IF NOT EXISTS idx_application_emails_created_at ON application_emails(created_at);

CREATE INDEX IF NOT EXISTS idx_cover_letters_user_id ON cover_letters(user_id);
CREATE INDEX IF NOT EXISTS idx_cover_letters_cv_id ON cover_letters(cv_id);
CREATE INDEX IF NOT EXISTS idx_cover_letters_created_at ON cover_letters(created_at);

-- Enable RLS
ALTER TABLE application_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE cover_letters ENABLE ROW LEVEL SECURITY;

-- Create RLS policies with proper type conversion
-- Users can only see their own emails
CREATE POLICY "Users can view their own emails" ON application_emails
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own emails" ON application_emails
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own emails" ON application_emails
  FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own emails" ON application_emails
  FOR DELETE USING (user_id = auth.uid()::text);

-- Users can only see their own cover letters
CREATE POLICY "Users can view their own cover letters" ON cover_letters
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own cover letters" ON cover_letters
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own cover letters" ON cover_letters
  FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own cover letters" ON cover_letters
  FOR DELETE USING (user_id = auth.uid()::text);

-- Verify tables were created
SELECT 'application_emails created' as status, 'success' as result
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'application_emails');

SELECT 'cover_letters created' as status, 'success' as result
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cover_letters'); 