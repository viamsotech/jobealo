-- ================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) FOR ALL TABLES
-- ================================================================
-- This script enables RLS and creates security policies for all tables
-- Run this in Supabase SQL Editor

-- Enable RLS for all critical tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_cvs ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE cover_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE individual_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_fingerprints ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- USERS TABLE POLICIES
-- ================================================================

-- Users can only view their own profile
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Users can only delete their own account
CREATE POLICY "Users can delete their own account" ON users
  FOR DELETE USING (auth.uid() = id);

-- Allow user registration (INSERT) - this is handled by auth system
CREATE POLICY "Allow user registration" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ================================================================
-- SAVED CVS TABLE POLICIES
-- ================================================================

-- Users can only view their own CVs
CREATE POLICY "Users can view their own CVs" ON saved_cvs
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only create CVs for themselves
CREATE POLICY "Users can create their own CVs" ON saved_cvs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own CVs
CREATE POLICY "Users can update their own CVs" ON saved_cvs
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own CVs
CREATE POLICY "Users can delete their own CVs" ON saved_cvs
  FOR DELETE USING (auth.uid() = user_id);

-- ================================================================
-- APPLICATION EMAILS TABLE POLICIES
-- ================================================================

-- Users can only view their own emails
CREATE POLICY "Users can view their own emails" ON application_emails
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only create emails for themselves
CREATE POLICY "Users can create their own emails" ON application_emails
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own emails
CREATE POLICY "Users can update their own emails" ON application_emails
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own emails
CREATE POLICY "Users can delete their own emails" ON application_emails
  FOR DELETE USING (auth.uid() = user_id);

-- ================================================================
-- COVER LETTERS TABLE POLICIES
-- ================================================================

-- Users can only view their own cover letters
CREATE POLICY "Users can view their own cover letters" ON cover_letters
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only create cover letters for themselves
CREATE POLICY "Users can create their own cover letters" ON cover_letters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own cover letters
CREATE POLICY "Users can update their own cover letters" ON cover_letters
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own cover letters
CREATE POLICY "Users can delete their own cover letters" ON cover_letters
  FOR DELETE USING (auth.uid() = user_id);

-- ================================================================
-- USER ACTIONS TABLE POLICIES
-- ================================================================

-- Users can only view their own actions
CREATE POLICY "Users can view their own actions" ON user_actions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only create actions for themselves (when authenticated)
CREATE POLICY "Users can create their own actions" ON user_actions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    (auth.uid() IS NULL AND user_id IS NULL) -- Allow anonymous actions
  );

-- Users cannot update actions (they are immutable records)
-- Users cannot delete actions (they are permanent records)

-- ================================================================
-- DOWNLOADS TABLE POLICIES
-- ================================================================

-- Users can only view their own downloads
CREATE POLICY "Users can view their own downloads" ON downloads
  FOR SELECT USING (auth.uid() = user_id);

-- System can insert download records (handled by API)
CREATE POLICY "System can insert download records" ON downloads
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    (auth.uid() IS NULL AND user_id IS NULL) -- Allow anonymous downloads
  );

-- Downloads cannot be updated or deleted (they are immutable records)

-- ================================================================
-- INDIVIDUAL PURCHASES TABLE POLICIES
-- ================================================================

-- Users can only view their own purchases
CREATE POLICY "Users can view their own purchases" ON individual_purchases
  FOR SELECT USING (auth.uid() = user_id);

-- System can insert purchase records (handled by Stripe webhook)
CREATE POLICY "System can insert purchase records" ON individual_purchases
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    (auth.uid() IS NULL AND user_id IS NULL) -- Allow anonymous purchases
  );

-- Purchases cannot be updated or deleted (they are immutable records)

-- ================================================================
-- USER FINGERPRINTS TABLE POLICIES
-- ================================================================

-- Users can view fingerprints linked to their account
CREATE POLICY "Users can view their own fingerprints" ON user_fingerprints
  FOR SELECT USING (auth.uid() = user_id);

-- System can create fingerprint records
CREATE POLICY "System can create fingerprint records" ON user_fingerprints
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    (auth.uid() IS NULL AND user_id IS NULL) -- Allow anonymous fingerprints
  );

-- System can update fingerprints (for linking to user accounts)
CREATE POLICY "System can update fingerprints" ON user_fingerprints
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    (auth.uid() IS NULL AND user_id IS NULL) -- Allow anonymous fingerprint updates
  );

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

-- Check that RLS is enabled for all tables
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'users', 'saved_cvs', 'application_emails', 'cover_letters', 
  'user_actions', 'downloads', 'individual_purchases', 'user_fingerprints'
)
ORDER BY tablename;

-- Check all policies created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN (
  'users', 'saved_cvs', 'application_emails', 'cover_letters', 
  'user_actions', 'downloads', 'individual_purchases', 'user_fingerprints'
)
ORDER BY tablename, policyname;

-- ================================================================
-- SUCCESS MESSAGE
-- ================================================================

SELECT 'RLS Security policies successfully implemented!' as status;
SELECT 'All tables are now protected with Row Level Security' as message; 