-- Query para revisar la estructura de la base de datos antes de crear las tablas de aplicaciones

-- 1. Verificar estructura de la tabla users
SELECT 
    'users table structure' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- 2. Verificar estructura de la tabla saved_cvs
SELECT 
    'saved_cvs table structure' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'saved_cvs' 
ORDER BY ordinal_position;

-- 3. Verificar las foreign keys existentes
SELECT 
    'foreign keys' as info,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND (tc.table_name = 'users' OR tc.table_name = 'saved_cvs');

-- 4. Verificar las políticas RLS existentes
SELECT 
    'rls policies' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('users', 'saved_cvs')
ORDER BY tablename, policyname;

-- 5. Verificar si auth.uid() funciona correctamente
SELECT 
    'auth function test' as info,
    'Checking if auth.uid() function exists' as description;

-- 6. Verificar muestras de datos para entender los tipos
SELECT 
    'users sample data' as info,
    id,
    email,
    pg_typeof(id) as id_type,
    pg_typeof(email) as email_type
FROM users 
LIMIT 3;

SELECT 
    'saved_cvs sample data' as info,
    id,
    user_id,
    title,
    pg_typeof(id) as id_type,
    pg_typeof(user_id) as user_id_type
FROM saved_cvs 
LIMIT 3;

-- 7. Verificar si las tablas de aplicaciones ya existen
SELECT 
    'existing tables check' as info,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name IN ('application_emails', 'cover_letters');

-- 8. Verificar el esquema actual de autenticación
SELECT 
    'auth schema check' as info,
    nspname as schema_name
FROM pg_namespace 
WHERE nspname = 'auth'; 