-- Script para arreglar la constraint de download_type en la tabla downloads
-- Ejecutar en Supabase SQL Editor

-- Primero eliminamos la constraint existente
ALTER TABLE downloads DROP CONSTRAINT IF EXISTS downloads_download_type_check;

-- Creamos la nueva constraint con todos los tipos de descarga permitidos
ALTER TABLE downloads ADD CONSTRAINT downloads_download_type_check 
CHECK (download_type IN (
  'FREE_SPANISH', 
  'PAID_SPANISH', 
  'PAID_ENGLISH',
  'FREE_ENGLISH',
  'LIFETIME_SPANISH',
  'LIFETIME_ENGLISH', 
  'PRO_SPANISH',
  'PRO_ENGLISH'
));

-- Verificar que la constraint se aplicó correctamente
SELECT conname, consrc 
FROM pg_constraint 
WHERE conname = 'downloads_download_type_check'; 