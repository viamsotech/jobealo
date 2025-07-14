-- ================================================================
-- SPECIAL RLS POLICIES FOR SYSTEM OPERATIONS
-- ================================================================
-- This script creates special policies for tables that need system-level access
-- Run this AFTER the main RLS script

-- ================================================================
-- DOWNLOAD LIMITS TABLE (PUBLIC READ ACCESS)
-- ================================================================

-- Enable RLS for download_limits but allow public read access
ALTER TABLE download_limits ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read download limits (needed for checking limits)
CREATE POLICY "Allow public read access to download limits" ON download_limits
  FOR SELECT TO PUBLIC USING (true);

-- Only system/admins can modify download limits
CREATE POLICY "Only system can modify download limits" ON download_limits
  FOR INSERT TO PUBLIC WITH CHECK (false);

CREATE POLICY "Only system can update download limits" ON download_limits
  FOR UPDATE TO PUBLIC USING (false);

CREATE POLICY "Only system can delete download limits" ON download_limits
  FOR DELETE TO PUBLIC USING (false);

-- ================================================================
-- SERVICE ROLE POLICIES FOR WEBHOOKS
-- ================================================================

-- Create a service role policy for Stripe webhooks and system operations
-- This allows the service role to bypass RLS for specific operations

-- Allow service role to insert purchases from webhooks
CREATE POLICY "Service role can insert purchases" ON individual_purchases
  FOR INSERT TO service_role WITH CHECK (true);

-- Allow service role to update users from webhooks
CREATE POLICY "Service role can update users" ON users
  FOR UPDATE TO service_role USING (true);

-- Allow service role to insert users from webhooks
CREATE POLICY "Service role can insert users" ON users
  FOR INSERT TO service_role WITH CHECK (true);

-- Allow service role to insert downloads from API
CREATE POLICY "Service role can insert downloads" ON downloads
  FOR INSERT TO service_role WITH CHECK (true);

-- Allow service role to insert actions from API
CREATE POLICY "Service role can insert actions" ON user_actions
  FOR INSERT TO service_role WITH CHECK (true);

-- Allow service role to insert/update fingerprints from API
CREATE POLICY "Service role can manage fingerprints" ON user_fingerprints
  FOR ALL TO service_role USING (true);

-- ================================================================
-- ANONYMOUS USER POLICIES
-- ================================================================

-- Create policies for anonymous users to interact with the system
-- These allow anonymous users to create actions and downloads

-- Allow anonymous users to create fingerprints
CREATE POLICY "Anonymous users can create fingerprints" ON user_fingerprints
  FOR INSERT TO anon WITH CHECK (user_id IS NULL);

-- Allow anonymous users to view their own fingerprints
CREATE POLICY "Anonymous users can view own fingerprints" ON user_fingerprints
  FOR SELECT TO anon USING (user_id IS NULL);

-- Allow anonymous users to create actions
CREATE POLICY "Anonymous users can create actions" ON user_actions
  FOR INSERT TO anon WITH CHECK (user_id IS NULL);

-- Allow anonymous users to create downloads
CREATE POLICY "Anonymous users can create downloads" ON downloads
  FOR INSERT TO anon WITH CHECK (user_id IS NULL);

-- ================================================================
-- AUTHENTICATED USER ENHANCED POLICIES
-- ================================================================

-- Allow authenticated users to link their fingerprints
CREATE POLICY "Authenticated users can link fingerprints" ON user_fingerprints
  FOR UPDATE TO authenticated 
  USING (user_id IS NULL) 
  WITH CHECK (auth.uid() = user_id);

-- ================================================================
-- CLEANUP EXISTING CONFLICTING POLICIES
-- ================================================================

-- Drop any existing policies that might conflict
DROP POLICY IF EXISTS "Users can view their own fingerprints" ON user_fingerprints;
DROP POLICY IF EXISTS "System can create fingerprint records" ON user_fingerprints;
DROP POLICY IF EXISTS "System can update fingerprints" ON user_fingerprints;
DROP POLICY IF EXISTS "Users can create their own actions" ON user_actions;
DROP POLICY IF EXISTS "System can insert download records" ON downloads;
DROP POLICY IF EXISTS "System can insert purchase records" ON individual_purchases;

-- ================================================================
-- RECREATE IMPROVED POLICIES
-- ================================================================

-- Fingerprints: Allow users to view their own and anonymous to view their own
CREATE POLICY "Users can view their own fingerprints" ON user_fingerprints
  FOR SELECT USING (
    auth.uid() = user_id OR 
    (auth.role() = 'anon' AND user_id IS NULL)
  );

-- Actions: Allow users to create for themselves and anonymous to create
CREATE POLICY "Users can create actions" ON user_actions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    (auth.role() = 'anon' AND user_id IS NULL)
  );

-- Downloads: Allow users to create for themselves and anonymous to create
CREATE POLICY "Users can create downloads" ON downloads
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    (auth.role() = 'anon' AND user_id IS NULL)
  );

-- Purchases: Allow users to create for themselves and anonymous to create
CREATE POLICY "Users can create purchases" ON individual_purchases
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    (auth.role() = 'anon' AND user_id IS NULL)
  );

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

-- Check all policies for critical tables
SELECT 
  'Policy verification' as info,
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN (
  'users', 'saved_cvs', 'application_emails', 'cover_letters', 
  'user_actions', 'downloads', 'individual_purchases', 'user_fingerprints',
  'download_limits'
)
ORDER BY tablename, policyname;

-- Check RLS status
SELECT 
  'RLS status' as info,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'users', 'saved_cvs', 'application_emails', 'cover_letters', 
  'user_actions', 'downloads', 'individual_purchases', 'user_fingerprints',
  'download_limits'
)
ORDER BY tablename;

-- ================================================================
-- SUCCESS MESSAGE
-- ================================================================

SELECT 'Special RLS policies successfully implemented!' as status;
SELECT 'System operations and anonymous users are now properly handled' as message; 