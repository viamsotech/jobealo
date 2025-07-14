-- ================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) FOR ALL TABLES - FIXED VERSION
-- ================================================================
-- This script enables RLS and creates security policies for all tables
-- Handles both UUID and TEXT ID types with explicit casting

-- Enable RLS for all critical tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_cvs ENABLE ROW LEVEL SECURITY;
-- Only enable RLS for tables that exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'application_emails') THEN
        ALTER TABLE application_emails ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cover_letters') THEN
        ALTER TABLE cover_letters ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_actions') THEN
        ALTER TABLE user_actions ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE individual_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_fingerprints ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- USERS TABLE POLICIES
-- ================================================================

-- Users can only view their own profile
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

-- Users can only update their own profile
CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Users can only delete their own account
CREATE POLICY "Users can delete their own account" ON users
  FOR DELETE USING (auth.uid()::text = id::text);

-- Allow user registration (INSERT) - this is handled by auth system
CREATE POLICY "Allow user registration" ON users
  FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- ================================================================
-- SAVED CVS TABLE POLICIES
-- ================================================================

-- Users can only view their own CVs
CREATE POLICY "Users can view their own CVs" ON saved_cvs
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- Users can only create CVs for themselves
CREATE POLICY "Users can create their own CVs" ON saved_cvs
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Users can only update their own CVs
CREATE POLICY "Users can update their own CVs" ON saved_cvs
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Users can only delete their own CVs
CREATE POLICY "Users can delete their own CVs" ON saved_cvs
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- ================================================================
-- APPLICATION EMAILS TABLE POLICIES (if exists)
-- ================================================================

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'application_emails') THEN
        -- Users can only view their own emails
        EXECUTE 'CREATE POLICY "Users can view their own emails" ON application_emails
          FOR SELECT USING (auth.uid()::text = user_id::text)';

        -- Users can only create emails for themselves
        EXECUTE 'CREATE POLICY "Users can create their own emails" ON application_emails
          FOR INSERT WITH CHECK (auth.uid()::text = user_id::text)';

        -- Users can only update their own emails
        EXECUTE 'CREATE POLICY "Users can update their own emails" ON application_emails
          FOR UPDATE USING (auth.uid()::text = user_id::text)';

        -- Users can only delete their own emails
        EXECUTE 'CREATE POLICY "Users can delete their own emails" ON application_emails
          FOR DELETE USING (auth.uid()::text = user_id::text)';
    END IF;
END $$;

-- ================================================================
-- COVER LETTERS TABLE POLICIES (if exists)
-- ================================================================

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cover_letters') THEN
        -- Users can only view their own cover letters
        EXECUTE 'CREATE POLICY "Users can view their own cover letters" ON cover_letters
          FOR SELECT USING (auth.uid()::text = user_id::text)';

        -- Users can only create cover letters for themselves
        EXECUTE 'CREATE POLICY "Users can create their own cover letters" ON cover_letters
          FOR INSERT WITH CHECK (auth.uid()::text = user_id::text)';

        -- Users can only update their own cover letters
        EXECUTE 'CREATE POLICY "Users can update their own cover letters" ON cover_letters
          FOR UPDATE USING (auth.uid()::text = user_id::text)';

        -- Users can only delete their own cover letters
        EXECUTE 'CREATE POLICY "Users can delete their own cover letters" ON cover_letters
          FOR DELETE USING (auth.uid()::text = user_id::text)';
    END IF;
END $$;

-- ================================================================
-- USER ACTIONS TABLE POLICIES (if exists)
-- ================================================================

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_actions') THEN
        -- Users can only view their own actions
        EXECUTE 'CREATE POLICY "Users can view their own actions" ON user_actions
          FOR SELECT USING (auth.uid()::text = user_id::text)';

        -- Users can only create actions for themselves (when authenticated)
        EXECUTE 'CREATE POLICY "Users can create their own actions" ON user_actions
          FOR INSERT WITH CHECK (
            auth.uid()::text = user_id::text OR 
            (auth.uid() IS NULL AND user_id IS NULL)
          )';
    END IF;
END $$;

-- ================================================================
-- DOWNLOADS TABLE POLICIES
-- ================================================================

-- Users can only view their own downloads
CREATE POLICY "Users can view their own downloads" ON downloads
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- System can insert download records (handled by API)
CREATE POLICY "System can insert download records" ON downloads
  FOR INSERT WITH CHECK (
    auth.uid()::text = user_id::text OR 
    (auth.uid() IS NULL AND user_id IS NULL)
  );

-- ================================================================
-- INDIVIDUAL PURCHASES TABLE POLICIES
-- ================================================================

-- Users can only view their own purchases
CREATE POLICY "Users can view their own purchases" ON individual_purchases
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- System can insert purchase records (handled by Stripe webhook)
CREATE POLICY "System can insert purchase records" ON individual_purchases
  FOR INSERT WITH CHECK (
    auth.uid()::text = user_id::text OR 
    (auth.uid() IS NULL AND user_id IS NULL)
  );

-- ================================================================
-- USER FINGERPRINTS TABLE POLICIES
-- ================================================================

-- Users can view fingerprints linked to their account
CREATE POLICY "Users can view their own fingerprints" ON user_fingerprints
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- System can create fingerprint records
CREATE POLICY "System can create fingerprint records" ON user_fingerprints
  FOR INSERT WITH CHECK (
    auth.uid()::text = user_id::text OR 
    (auth.uid() IS NULL AND user_id IS NULL)
  );

-- System can update fingerprints (for linking to user accounts)
CREATE POLICY "System can update fingerprints" ON user_fingerprints
  FOR UPDATE USING (
    auth.uid()::text = user_id::text OR 
    (auth.uid() IS NULL AND user_id IS NULL)
  );

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

-- Check that RLS is enabled for all tables
SELECT 
  'RLS Status Check' as info,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity = true THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'users', 'saved_cvs', 'application_emails', 'cover_letters', 
  'user_actions', 'downloads', 'individual_purchases', 'user_fingerprints'
)
ORDER BY tablename;

-- Check all policies created
SELECT 
  'Policies Created' as info,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename IN (
  'users', 'saved_cvs', 'application_emails', 'cover_letters', 
  'user_actions', 'downloads', 'individual_purchases', 'user_fingerprints'
)
ORDER BY tablename, policyname;

-- Check data types for debugging
SELECT 
  'Data Types Check' as info,
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name IN ('users', 'saved_cvs', 'downloads', 'individual_purchases', 'user_fingerprints')
AND column_name IN ('id', 'user_id')
ORDER BY table_name, column_name;

-- ================================================================
-- SUCCESS MESSAGE
-- ================================================================

SELECT 'RLS Security policies successfully implemented!' as status;
SELECT 'All tables are now protected with Row Level Security' as message; 