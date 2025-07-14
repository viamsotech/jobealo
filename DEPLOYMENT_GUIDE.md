# 🚀 Guía de Deployment a Producción - Jobealo

## 📋 Checklist de Variables de Entorno

### ⚠️ Variables que DEBEN ser cambiadas para producción:

### 1. **NextAuth Configuration**
```env
# ❌ Desarrollo
NEXTAUTH_URL="http://localhost:3000"

# ✅ Producción
NEXTAUTH_URL="https://tudominio.com"
```

### 2. **Stripe Configuration**
```env
# ❌ Desarrollo (Test Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# ✅ Producción (Live Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### 3. **Google OAuth Configuration**
Las redirect URIs en Google Cloud Console deben ser actualizadas:

```
# ❌ Desarrollo
Authorized JavaScript origins: http://localhost:3000
Authorized redirect URIs: http://localhost:3000/api/auth/callback/google

# ✅ Producción
Authorized JavaScript origins: https://tudominio.com
Authorized redirect URIs: https://tudominio.com/api/auth/callback/google
```

### 4. **Variables que pueden mantenerse igual**
```env
# ✅ Estas NO necesitan cambiar
DATABASE_URL="postgresql://postgres:..."
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
OPENAI_API_KEY="sk-..."
NEXTAUTH_SECRET="..."
STRIPE_PRO_PRICE_ID="price_..."
STRIPE_LIFETIME_PRICE_ID="price_..."
```

---

## 🔧 Configuraciones Específicas por Plataforma

### **Stripe Dashboard Changes**

1. **Activar Live Mode**
   - En Stripe Dashboard, cambiar de "Test mode" a "Live mode"
   - Obtener nuevas claves de API (pk_live_, sk_live_)

2. **Actualizar Webhook Endpoint**
   ```
   ❌ Desarrollo: https://tu-ngrok-url.ngrok.io/api/stripe/webhook
   ✅ Producción: https://tudominio.com/api/stripe/webhook
   ```

3. **Verificar Productos**
   - Asegurar que los productos estén creados en Live mode
   - Verificar Price IDs en Live mode

### **Google Cloud Console Changes**

1. **Ir a**: [Google Cloud Console](https://console.cloud.google.com/)
2. **Navegar a**: APIs & Services → Credentials
3. **Editar OAuth 2.0 Client ID**
4. **Actualizar**:
   - Authorized JavaScript origins: `https://tudominio.com`
   - Authorized redirect URIs: `https://tudominio.com/api/auth/callback/google`

---

## 🌐 Configuración por Plataforma de Deployment

### **Vercel**
```env
# Variables de entorno en Vercel Dashboard
NEXTAUTH_URL=https://tudominio.vercel.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### **Netlify**
```env
# Variables de entorno en Netlify Dashboard
NEXTAUTH_URL=https://tudominio.netlify.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### **Railway/Render**
```env
# Variables de entorno en Railway/Render Dashboard
NEXTAUTH_URL=https://tudominio.railway.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 🔐 Security Checklist

### **Antes de ir a producción:**
- [ ] Cambiar NEXTAUTH_URL a dominio de producción
- [ ] Activar Stripe Live mode y obtener nuevas claves
- [ ] Actualizar webhook de Stripe con URL de producción
- [ ] Configurar Google OAuth con URLs de producción
- [ ] Verificar que NEXTAUTH_SECRET sea único y seguro
- [ ] Confirmar que todas las variables estén configuradas en la plataforma de deploy

### **Configuraciones de dominio:**
- [ ] Configurar SSL/TLS (HTTPS)
- [ ] Configurar subdominios si es necesario
- [ ] Verificar que todos los endpoints funcionen con HTTPS

---

## 🧪 Testing en Producción

### **Flujo de pruebas recomendado:**
1. **Autenticación con Google** ✅
2. **Registro con email/password** ✅
3. **Generación de CV** ✅
4. **Descarga PDF** ✅
5. **Pago con Stripe** ✅
6. **Upgrade de plan** ✅
7. **Funciones de IA** ✅

### **Tarjetas de prueba en Live mode:**
⚠️ **IMPORTANTE**: En Live mode, NO uses tarjetas de prueba. Usa pagos reales o configura un entorno de staging.

---

## 📝 Template de Variables de Entorno para Producción

```env
# Database
DATABASE_URL="postgresql://postgres:your-password@aws-0-us-east-2.pooler.supabase.com:6543/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://ymldnzlozbhjtjrlyclk.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# OpenAI
OPENAI_API_KEY="sk-your-openai-key"

# NextAuth - CAMBIAR URL A PRODUCCIÓN
NEXTAUTH_SECRET="ODqk8k4fSsZboCeySbr4G/MBt+TGIBKJo8gLgcXvuuE="
NEXTAUTH_URL="https://tudominio.com"

# Google OAuth - CONFIGURAR PARA PRODUCCIÓN
GOOGLE_CLIENT_ID="TU_GOOGLE_CLIENT_ID_AQUI"
GOOGLE_CLIENT_SECRET="TU_GOOGLE_CLIENT_SECRET_AQUI"

# Stripe - CAMBIAR A LIVE MODE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_TU_STRIPE_PUBLISHABLE_KEY_AQUI"
STRIPE_SECRET_KEY="sk_live_TU_STRIPE_SECRET_KEY_AQUI"
STRIPE_WEBHOOK_SECRET="whsec_TU_STRIPE_WEBHOOK_SECRET_AQUI"

# Stripe Price IDs - VERIFICAR EN LIVE MODE
STRIPE_PRO_PRICE_ID="price_TU_PRO_PRICE_ID_AQUI"
STRIPE_LIFETIME_PRICE_ID="price_TU_LIFETIME_PRICE_ID_AQUI"
```

---

## 🚨 Errores Comunes y Soluciones

### **1. Google OAuth Error**
```
Error: redirect_uri_mismatch
```
**Solución**: Verificar que las redirect URIs en Google Cloud Console coincidan exactamente con la URL de producción.

### **2. Stripe Webhook Error**
```
Error: No signatures found matching the expected signature
```
**Solución**: Actualizar STRIPE_WEBHOOK_SECRET con el secret del webhook de producción.

### **3. NextAuth Error**
```
Error: Invalid URL
```
**Solución**: Verificar que NEXTAUTH_URL esté configurado correctamente con HTTPS.

---

## 📞 Contacto de Soporte

Si tienes problemas durante el deployment, revisa:
1. Logs de la aplicación
2. Dashboard de Stripe (eventos y logs)
3. Google Cloud Console (errores de OAuth)
4. Configuraciones de variables de entorno

¡Tu aplicación está lista para producción! 🎉 