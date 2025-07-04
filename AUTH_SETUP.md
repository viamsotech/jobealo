# 🔐 Configuración de Autenticación OAuth

## Variables de Entorno Requeridas

Agrega estas variables a tu archivo `.env.local`:

```env
# NextAuth
NEXTAUTH_SECRET="tu-clave-secreta-aqui"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="tu-google-client-id"
GOOGLE_CLIENT_SECRET="tu-google-client-secret"
```

## 🔧 Configuración de Proveedores OAuth

### 1. Google OAuth

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la **Google+ API**
4. Ve a **Credenciales** → **Crear credenciales** → **ID de cliente OAuth 2.0**
5. Configura los orígenes autorizados:
   - **Orígenes autorizados:** `http://localhost:3000` (desarrollo)
   - **URIs de redirección:** `http://localhost:3000/api/auth/callback/google`
6. Copia el **Client ID** y **Client Secret**

### 2. Email y Contraseña

El sistema también soporta registro e inicio de sesión con email y contraseña:

- **Registro:** `/auth/signup` - Crear nueva cuenta
- **Inicio de sesión:** `/auth/signin` - Acceder con credenciales
- **Validaciones:** Email válido, contraseña mínimo 6 caracteres
- **Seguridad:** Contraseñas hasheadas con bcrypt (12 salt rounds)

### 3. NextAuth Secret

Genera una clave secreta:
```bash
openssl rand -base64 32
```

## 🚀 Estado Actual

✅ **Completado:**
- Configuración de NextAuth
- Páginas de autenticación (signin, signup, error)
- Integración con Supabase
- Componentes de UI
- Sistema de registro con email/contraseña
- API de registro (`/api/auth/register`)

⏳ **Siguiente paso:**
- Configurar variables OAuth de Google
- Probar autenticación
- Integrar con sistema de descargas

## 📝 Rutas Disponibles

- `/auth/signin` - Página de inicio de sesión
- `/auth/signup` - Página de registro
- `/auth/error` - Página de errores de autenticación
- `/api/auth/[...nextauth]` - API de NextAuth
- `/api/auth/register` - API de registro

## 🎯 Funcionalidad

- **Login/Logout** con Google y email/contraseña
- **Registro** con email/contraseña
- **Gestión automática** de usuarios en Supabase
- **Integración** con sistema de planes (Freemium/Pro/Lifetime)
- **UI responsive** con dropdowns y avatares
- **Validaciones** de formularios y manejo de errores
- **Seguridad** con bcrypt para contraseñas

## 🔐 Proveedores Soportados

1. **Google OAuth** - Inicio de sesión rápido con cuenta de Google
2. **Email/Contraseña** - Registro tradicional para usuarios sin Gmail

## 📋 Notas Importantes

- Las contraseñas se almacenan hasheadas con bcrypt
- Los usuarios pueden cambiar entre proveedores si usan el mismo email
- El sistema maneja automáticamente la creación de usuarios en Supabase
- Los errores de autenticación se muestran en páginas dedicadas 