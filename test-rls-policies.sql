-- ================================================================
-- RLS POLICIES TESTING SCRIPT
-- ================================================================
-- This script helps verify that RLS policies are working correctly
-- Run these tests after implementing RLS policies

-- ================================================================
-- PRELIMINARY CHECKS
-- ================================================================

-- 1. Verify RLS is enabled on all tables
SELECT 
  'RLS Status Check' as test_name,
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
  'user_actions', 'downloads', 'individual_purchases', 'user_fingerprints',
  'download_limits'
)
ORDER BY tablename;

-- 2. Count policies per table
SELECT 
  'Policy Count Check' as test_name,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename IN (
  'users', 'saved_cvs', 'application_emails', 'cover_letters', 
  'user_actions', 'downloads', 'individual_purchases', 'user_fingerprints',
  'download_limits'
)
GROUP BY tablename
ORDER BY tablename;

-- 3. List all policies
SELECT 
  'All Policies' as test_name,
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

-- ================================================================
-- FUNCTIONAL TESTS
-- ================================================================

-- 4. Test public access to download_limits (should work)
SELECT 
  'Download Limits Public Access' as test_name,
  'Should return rows' as expected,
  COUNT(*) as row_count
FROM download_limits;

-- 5. Test that we can't see all users without auth context
-- Note: This should return 0 rows when run as anonymous user
SELECT 
  'Users Table Security Test' as test_name,
  'Should return 0 rows for anonymous user' as expected,
  COUNT(*) as row_count
FROM users;

-- 6. Test that we can't see all CVs without auth context
SELECT 
  'CVs Table Security Test' as test_name,
  'Should return 0 rows for anonymous user' as expected,
  COUNT(*) as row_count
FROM saved_cvs;

-- 7. Test that we can't see application emails without auth context
SELECT 
  'Application Emails Security Test' as test_name,
  'Should return 0 rows for anonymous user' as expected,
  COUNT(*) as row_count
FROM application_emails;

-- 8. Test that we can't see cover letters without auth context
SELECT 
  'Cover Letters Security Test' as test_name,
  'Should return 0 rows for anonymous user' as expected,
  COUNT(*) as row_count
FROM cover_letters;

-- ================================================================
-- ANONYMOUS USER TESTS
-- ================================================================

-- 9. Test anonymous fingerprint creation (should work)
-- Note: This is a simulation - actual test would be done via API
SELECT 
  'Anonymous Fingerprint Test' as test_name,
  'Anonymous users should be able to create fingerprints' as note,
  'Run via API: POST /api/fingerprint' as test_method;

-- 10. Test anonymous action creation (should work)
SELECT 
  'Anonymous Action Test' as test_name,
  'Anonymous users should be able to create actions' as note,
  'Run via API: POST /api/actions/record' as test_method;

-- 11. Test anonymous download creation (should work)
SELECT 
  'Anonymous Download Test' as test_name,
  'Anonymous users should be able to create downloads' as note,
  'Run via API: POST /api/downloads/record' as test_method;

-- ================================================================
-- AUTHENTICATED USER SIMULATION
-- ================================================================

-- 12. Simulate authenticated user context
-- Note: These tests would need to be run with actual auth.uid() context
SELECT 
  'Authenticated User Tests' as test_name,
  'The following tests need authenticated context' as note;

-- Test user can see their own data
-- SET session.user_id = 'user-uuid-here';
-- SELECT * FROM users WHERE id = 'user-uuid-here';

-- ================================================================
-- POTENTIAL SECURITY VULNERABILITIES TO CHECK
-- ================================================================

-- 13. Try to access other users' data (should fail)
SELECT 
  'Security Vulnerability Check' as test_name,
  'Verify no cross-user data access' as check_description,
  'These should all return 0 rows for non-matching user_id' as note;

-- 14. Try to modify other users' data (should fail)
SELECT 
  'Data Modification Security Check' as test_name,
  'Verify no cross-user data modification' as check_description,
  'Updates/Deletes should fail for non-matching user_id' as note;

-- ================================================================
-- SERVICE ROLE TESTS
-- ================================================================

-- 15. Test service role access (needs to be run with service role)
SELECT 
  'Service Role Access Test' as test_name,
  'Service role should have elevated permissions' as note,
  'Run these tests with service role JWT token' as method;

-- ================================================================
-- WEBHOOK SIMULATION TESTS
-- ================================================================

-- 16. Test webhook operations (Stripe webhook simulation)
SELECT 
  'Webhook Operations Test' as test_name,
  'Webhooks should be able to create users and purchases' as note,
  'Test via Stripe webhook endpoint' as method;

-- ================================================================
-- PERFORMANCE TESTS
-- ================================================================

-- 17. Check for missing indexes that might affect RLS performance
SELECT 
  'RLS Performance Check' as test_name,
  'Verify indexes exist for RLS policy columns' as note;

-- Check for user_id indexes
SELECT 
  'User ID Indexes' as check_type,
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE indexdef LIKE '%user_id%'
AND schemaname = 'public'
ORDER BY tablename, indexname;

-- Check for auth.uid() related indexes
SELECT 
  'Auth UID Indexes' as check_type,
  'Verify indexes exist for auth.uid() lookups' as note,
  'Important for RLS performance' as importance;

-- ================================================================
-- FINAL VERIFICATION
-- ================================================================

-- 18. Summary report
SELECT 
  'RLS Implementation Summary' as report_section,
  'All critical tables should have RLS enabled' as requirement_1,
  'Each table should have appropriate policies' as requirement_2,
  'Anonymous users should have limited access' as requirement_3,
  'Authenticated users should only see their own data' as requirement_4,
  'Service role should have elevated permissions' as requirement_5;

-- 19. Next steps
SELECT 
  'Next Steps' as section,
  '1. Test API endpoints with anonymous requests' as step_1,
  '2. Test API endpoints with authenticated requests' as step_2,
  '3. Test Stripe webhook functionality' as step_3,
  '4. Monitor query performance after RLS' as step_4,
  '5. Set up monitoring for RLS policy violations' as step_5;

-- ================================================================
-- SUCCESS MESSAGE
-- ================================================================

SELECT 'RLS Testing Script Complete!' as status;
SELECT 'Review all test results above to verify security implementation' as message; 