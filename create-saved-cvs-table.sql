-- Crear tabla saved_cvs para guardar CVs de usuarios
CREATE TABLE IF NOT EXISTS saved_cvs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  cv_data JSONB NOT NULL,
  is_template BOOLEAN DEFAULT false,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Foreign key constraint
  CONSTRAINT fk_saved_cvs_user_id 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_saved_cvs_user_id ON saved_cvs(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_cvs_updated_at ON saved_cvs(updated_at);
CREATE INDEX IF NOT EXISTS idx_saved_cvs_created_at ON saved_cvs(created_at);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_saved_cvs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en cada UPDATE
DROP TRIGGER IF EXISTS trigger_update_saved_cvs_updated_at ON saved_cvs;
CREATE TRIGGER trigger_update_saved_cvs_updated_at
  BEFORE UPDATE ON saved_cvs
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_cvs_updated_at(); 