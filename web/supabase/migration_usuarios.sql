-- Tabla de perfiles de usuario: mapea username → auth.users
-- Sistema de gestión interno DICOR — acceso anónimo de lectura aceptable
-- ya que RLS protege todas las demás tablas de negocio.

CREATE TABLE IF NOT EXISTS user_profiles (
  id       uuid  PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username text  UNIQUE NOT NULL,
  email    text  NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Lectura pública necesaria para el lookup de username en el login
CREATE POLICY "login_lookup" ON user_profiles
  FOR SELECT USING (true);

-- Solo el propio usuario puede insertar/actualizar/borrar su perfil
CREATE POLICY "solo_propio_perfil" ON user_profiles
  FOR ALL USING (auth.uid() = id);

-- ---------------------------------------------------------------
-- INSTRUCCIONES PARA AGREGAR USUARIOS:
--
-- 1. Crear el usuario en Supabase Auth (Authentication → Users → Invite)
--    con su email real y contraseña.
--
-- 2. Copiar el UUID del usuario recién creado y ejecutar:
--
--    INSERT INTO user_profiles (id, username, email)
--    VALUES ('<UUID>', 'nombreusuario', 'email@ejemplo.com');
--
-- El username debe estar en minúsculas. Ejemplo:
--    INSERT INTO user_profiles (id, username, email)
--    VALUES ('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'fabrizio', 'fabrizio@dicor.com');
-- ---------------------------------------------------------------
