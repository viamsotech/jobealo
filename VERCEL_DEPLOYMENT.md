# 🚀 Guía de Deployment a Vercel - Jobealo

## 📋 Pasos para Deployment

### 1. **Preparación del Proyecto**

```bash
# Asegúrate de que todo esté funcionando localmente
npm run build
npm run start

# Verificar que no hay errores
npm run lint
```

### 2. **Configuración de Variables de Entorno en Vercel**

```bash
# Configurar variables de entorno directamente desde CLI
vercel env add NEXTAUTH_URL
vercel env add NEXTAUTH_SECRET
vercel env add GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_SECRET
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add STRIPE_PRO_PRICE_ID
vercel env add STRIPE_LIFETIME_PRICE_ID
vercel env add DATABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add OPENAI_API_KEY
```

### 3. **Variables de Entorno para Producción**

```env
# NextAuth - CAMBIAR A TU DOMINIO
NEXTAUTH_URL=https://tudominio.com
NEXTAUTH_SECRET=ODqk8k4fSsZboCeySbr4G/MBt+TGIBKJo8gLgcXvuuE=

# Google OAuth - CONFIGURAR PARA PRODUCCIÓN
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret

# Stripe - CAMBIAR A LIVE MODE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs - LIVE MODE
STRIPE_PRO_PRICE_ID=price_live_...
STRIPE_LIFETIME_PRICE_ID=price_live_...

# Database y APIs (pueden mantenerse igual)
DATABASE_URL=postgresql://postgres:your-password@aws-0-us-east-2.pooler.supabase.com:6543/postgres
NEXT_PUBLIC_SUPABASE_URL=https://ymldnzlozbhjtjrlyclk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_KEY=sk-your-openai-key
```

### 4. **Configuración de Dominio Personalizado**

```bash
# Agregar dominio personalizado
vercel domains add tudominio.com
vercel domains add www.tudominio.com

# Configurar dominio principal
vercel alias set jobealo-xxxx.vercel.app tudominio.com
```

### 5. **Configuraciones Externas Requeridas**

#### **Google OAuth Configuration**
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Navega a **APIs & Services** → **Credentials**
3. Edita tu OAuth 2.0 Client ID
4. Actualiza **Authorized redirect URIs**:
   ```
   https://tudominio.com/api/auth/callback/google
   ```

#### **Stripe Configuration**
1. Ve a [Stripe Dashboard](https://dashboard.stripe.com/)
2. Cambia a **Live Mode** (toggle en la esquina superior izquierda)
3. Ve a **Developers** → **API Keys**
4. Copia las claves Live: `pk_live_...` y `sk_live_...`
5. Ve a **Developers** → **Webhooks**
6. Crea nuevo endpoint: `https://tudominio.com/api/stripe/webhook`
7. Selecciona eventos:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.deleted`
8. Copia el **Webhook Secret**: `whsec_...`

#### **Productos en Stripe Live Mode**
1. Ve a **Products** en Stripe Dashboard
2. Verifica que tengas los productos en **Live Mode**:
   - **Jobealo Pro**: $14.99/mes
   - **Jobealo Lifetime**: $59.99 one-time
3. Copia los **Price IDs** de Live Mode

### 6. **Deployment Commands**

```bash
# Primer deployment (configurará el proyecto)
vercel

# Deployments posteriores
vercel --prod

# Ver status del deployment
vercel ls

# Ver logs en tiempo real
vercel logs
```

### 7. **Configuración de vercel.json (Opcional)**

```json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "NEXTAUTH_URL": "https://tudominio.com"
  },
  "build": {
    "env": {
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY": "@stripe_publishable_key",
      "STRIPE_SECRET_KEY": "@stripe_secret_key"
    }
  }
}
```

### 8. **Checklist de Verificación Post-Deployment**

```bash
# Verificar que el sitio carga
curl -I https://tudominio.com

# Verificar API endpoints
curl https://tudominio.com/api/auth/session

# Verificar variables de entorno
vercel env ls
```

## 🧪 Testing Post-Deployment

### **Funcionalidades a Probar:**
- [ ] Página principal carga correctamente
- [ ] Registro con email/password
- [ ] Login con Google OAuth
- [ ] Generación de CV
- [ ] Descarga de PDF
- [ ] Pago con Stripe (usa tarjeta real en Live Mode)
- [ ] Webhook de Stripe funciona
- [ ] Upgrade de plan funciona

### **URLs a Verificar:**
- [ ] `https://tudominio.com` - Landing page
- [ ] `https://tudominio.com/cvs` - CV Builder
- [ ] `https://tudominio.com/auth/signin` - Login
- [ ] `https://tudominio.com/auth/signup` - Registro
- [ ] `https://tudominio.com/settings` - Configuración
- [ ] `https://tudominio.com/api/auth/session` - API funciona

## 🚨 Troubleshooting

### **Errores Comunes:**

#### **1. Build Error**
```bash
# Ver logs detallados
vercel logs --follow

# Verificar dependencias
npm run build
```

#### **2. Variables de Entorno**
```bash
# Verificar variables
vercel env ls

# Agregar variable faltante
vercel env add VARIABLE_NAME
```

#### **3. Dominio no Funciona**
```bash
# Verificar configuración DNS
vercel domains ls

# Verificar certificado SSL
vercel certs ls
```

#### **4. Stripe Webhook Error**
- Verificar que el endpoint sea: `https://tudominio.com/api/stripe/webhook`
- Verificar que el webhook secret sea correcto
- Verificar que esté en Live Mode

## 📊 Comandos Útiles

```bash
# Ver información del proyecto
vercel project ls

# Ver deployments
vercel ls

# Ver logs en tiempo real
vercel logs --follow

# Eliminar deployment
vercel rm <deployment-url>

# Ver estadísticas
vercel analytics

# Configurar alias
vercel alias set <vercel-url> <custom-domain>
```

## 🔐 Security Best Practices

1. **Variables de Entorno**: Nunca commitees .env files
2. **Stripe**: Usa siempre Live Mode en producción
3. **OAuth**: Configura dominios correctos
4. **Database**: Usa conexiones seguras
5. **API Keys**: Rota las claves periódicamente

## 🎉 ¡Listo para Producción!

Una vez completados todos estos pasos, tu aplicación Jobealo estará lista para recibir usuarios reales en producción con:

- ✅ Autenticación segura
- ✅ Pagos reales con Stripe
- ✅ Dominio personalizado
- ✅ HTTPS habilitado
- ✅ Base de datos configurada
- ✅ APIs funcionando

¡Tu plataforma de CV con IA está lista para cambiar carreras! 🚀 