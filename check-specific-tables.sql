-- Query específico para ver la estructura de las tablas users y saved_cvs

-- 1. Estructura de tabla users
\d users

-- 2. Estructura de tabla saved_cvs  
\d saved_cvs

-- 3. Verificar tipos de datos específicos
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('id', 'email')
ORDER BY ordinal_position;

-- 4. Verificar tipos de datos de saved_cvs
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'saved_cvs' 
AND column_name IN ('id', 'user_id')
ORDER BY ordinal_position;

-- 5. Verificar una muestra de datos reales
SELECT 
    id,
    user_id,
    length(id) as id_length,
    length(user_id) as user_id_length
FROM saved_cvs 
LIMIT 2;

-- 6. Verificar muestra de users
SELECT 
    id,
    email,
    length(id) as id_length
FROM users 
LIMIT 2; 