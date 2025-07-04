-- Arreglar políticas RLS para aplicaciones
-- Como usamos NextAuth (no Supabase Auth), deshabilitamos RLS y manejamos seguridad en la API

-- 1. Deshabilitar RLS en ambas tablas
ALTER TABLE application_emails DISABLE ROW LEVEL SECURITY;
ALTER TABLE cover_letters DISABLE ROW LEVEL SECURITY;

-- 2. Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Users can view their own emails" ON application_emails;
DROP POLICY IF EXISTS "Users can insert their own emails" ON application_emails;
DROP POLICY IF EXISTS "Users can update their own emails" ON application_emails;
DROP POLICY IF EXISTS "Users can delete their own emails" ON application_emails;

DROP POLICY IF EXISTS "Users can view their own cover letters" ON cover_letters;
DROP POLICY IF EXISTS "Users can insert their own cover letters" ON cover_letters;
DROP POLICY IF EXISTS "Users can update their own cover letters" ON cover_letters;
DROP POLICY IF EXISTS "Users can delete their own cover letters" ON cover_letters;

-- 3. Verificar que RLS está deshabilitado
SELECT 
    'rls status after fix' as info,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('application_emails', 'cover_letters');

-- 4. Verificar que las políticas fueron eliminadas
SELECT 
    'remaining policies' as info,
    count(*) as policy_count
FROM pg_policies 
WHERE tablename IN ('application_emails', 'cover_letters');

-- 5. Test de inserción (debería funcionar ahora)
SELECT 'Fix completed - RLS disabled, security handled at API level' as status; 