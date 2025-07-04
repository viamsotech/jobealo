-- Query para diagnosticar el problema de RLS

-- 1. Verificar si auth.uid() funciona
SELECT 
    'auth.uid() test' as test,
    auth.uid() as raw_uid,
    auth.uid()::text as text_uid,
    pg_typeof(auth.uid()) as uid_type,
    pg_typeof(auth.uid()::text) as text_uid_type;

-- 2. Verificar las políticas actuales
SELECT 
    'current policies' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('application_emails', 'cover_letters')
ORDER BY tablename, policyname;

-- 3. Verificar estructura de las tablas
SELECT 
    'application_emails structure' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'application_emails' 
ORDER BY ordinal_position;

-- 4. Verificar si RLS está habilitado
SELECT 
    'rls status' as info,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('application_emails', 'cover_letters');

-- 5. Test manual de inserción (esto fallará pero nos dará más info)
-- INSERT INTO application_emails (user_id, cv_id, title, content, job_description, formality, personality)
-- VALUES ('test-user-id', 'test-cv-id', 'Test Email', 'Test Content', 'Test Job', 'formal', 'profesional'); 