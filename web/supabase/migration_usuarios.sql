-- Tabla de perfiles de usuario: mapea username → auth.users

CREATE TABLE IF NOT EXISTS user_profiles (
  id       uuid  PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username text  UNIQUE NOT NULL,
  email    text  NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Solo el propio usuario puede leer/insertar/actualizar/borrar su perfil
DROP POLICY IF EXISTS "solo_propio_perfil" ON user_profiles;
CREATE POLICY "solo_propio_perfil" ON user_profiles
  FOR ALL USING (auth.uid() = id);

-- El lookup de username → email del login NO usa una policy pública
-- (eso permitía listar todos los usernames y emails con la anon key).
-- En su lugar, una función security definer devuelve el email solo
-- ante un username exacto.
DROP POLICY IF EXISTS "login_lookup" ON user_profiles;

CREATE OR REPLACE FUNCTION login_email(p_username text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT email FROM user_profiles WHERE username = lower(trim(p_username));
$$;

REVOKE ALL ON FUNCTION login_email(text) FROM public;
GRANT EXECUTE ON FUNCTION login_email(text) TO anon, authenticated;

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
