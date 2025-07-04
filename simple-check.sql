-- Query simple para verificar tipos de datos
SELECT 'users.id type' as info, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'id';
SELECT 'saved_cvs.id type' as info, data_type FROM information_schema.columns WHERE table_name = 'saved_cvs' AND column_name = 'id';
SELECT 'saved_cvs.user_id type' as info, data_type FROM information_schema.columns WHERE table_name = 'saved_cvs' AND column_name = 'user_id'; 