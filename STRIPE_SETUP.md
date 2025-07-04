# 💳 Configuración de Stripe para Jobealo

## Resumen del Sistema de Pagos

Jobealo usa **Stripe** para procesar pagos de los planes **Pro** ($14.99/mes) y **Lifetime** ($59.99 pago único).

## 🏗️ Arquitectura Implementada

### **Componentes Creados:**
- ✅ **`/src/lib/stripe.ts`** - Configuración de Stripe y constantes
- ✅ **`/src/hooks/useStripePayment.ts`** - Hook para manejar pagos
- ✅ **`/src/app/api/stripe/create-checkout-session/route.ts`** - Crear sesiones de pago
- ✅ **`/src/app/api/stripe/webhook/route.ts`** - Procesar webhooks de Stripe
- ✅ **`/src/app/api/stripe/verify-payment/route.ts`** - Verificar pagos
- ✅ **`/src/app/payment/success/page.tsx`** - Página de éxito
- ✅ **`/src/app/payment/cancel/page.tsx`** - Página de cancelación
- ✅ **Componentes actualizados:** `Pricing`, `AuthButton`

### **Flujo de Pago:**
1. **Usuario hace clic** en "Comenzar Ahora" (plan Pro/Lifetime)
2. **Se crea checkout session** vía API `/api/stripe/create-checkout-session`
3. **Redirección a Stripe Checkout** (seguro y PCI compliant)
4. **Usuario completa pago** en Stripe
5. **Webhook procesa el pago** y actualiza plan en base de datos
6. **Redirección a página de éxito** con detalles del pago

## 🚀 Configuración de Stripe (Paso a Paso)

### **Paso 1: Crear Cuenta en Stripe**

1. Ve a [stripe.com](https://stripe.com) y crea una cuenta
2. Completa el proceso de verificación
3. Activa tu cuenta (puede requerir documentos)

### **Paso 2: Obtener Claves de API**

1. En el **Dashboard de Stripe** → **Developers** → **API keys**
2. Copia las claves (modo Test para desarrollo):
   - **Publishable key** (pk_test_...)
   - **Secret key** (sk_test_...)

### **Paso 3: Crear Productos y Precios**

#### **Producto 1: Jobealo Pro**
1. **Products** → **Add product**
2. **Name:** `Jobealo Pro`
3. **Description:** `Plan mensual con descargas ilimitadas`
4. **Pricing:** `$14.99 USD` - `Recurring` - `Monthly`
5. **Guarda** y copia el **Price ID** (price_...)

#### **Producto 2: Jobealo Lifetime**
1. **Products** → **Add product**
2. **Name:** `Jobealo Lifetime`
3. **Description:** `Pago único de por vida`
4. **Pricing:** `$59.99 USD` - `One time`
5. **Guarda** y copia el **Price ID** (price_...)

### **Paso 4: Configurar Webhook**

1. **Developers** → **Webhooks** → **Add endpoint**
2. **Endpoint URL:** `https://tu-dominio.com/api/stripe/webhook`
   - Para desarrollo: `https://tu-ngrok-url.ngrok.io/api/stripe/webhook`
3. **Events to send:**
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.deleted`
4. **Guarda** y copia el **Webhook Secret** (whsec_...)

### **Paso 5: Configurar Variables de Entorno**

Actualiza tu archivo `.env.local` con las credenciales de Stripe:

```env
# Stripe - REEMPLAZA CON TUS CREDENCIALES REALES
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_TU_PUBLISHABLE_KEY"
STRIPE_SECRET_KEY="sk_test_TU_SECRET_KEY"
STRIPE_WEBHOOK_SECRET="whsec_TU_WEBHOOK_SECRET"

# Stripe Price IDs - REEMPLAZA CON LOS IDS REALES
STRIPE_PRO_PRICE_ID="price_TU_PRO_PRICE_ID"
STRIPE_LIFETIME_PRICE_ID="price_TU_LIFETIME_PRICE_ID"
```

## 🧪 Testing

### **Tarjetas de Prueba de Stripe:**
- **Éxito:** `4242 4242 4242 4242`
- **Falla:** `4000 0000 0000 0002`
- **3D Secure:** `4000 0025 0000 3155`
- **Fecha:** Cualquier fecha futura
- **CVC:** Cualquier 3 dígitos

### **Probar el Flujo Completo:**
1. ✅ **Registro/Login** funcionando
2. ✅ **Click en plan Pro/Lifetime** → Debe redirigir a Stripe
3. ✅ **Completar pago** → Debe redirigir a `/payment/success`
4. ✅ **Verificar plan actualizado** → En perfil del usuario
5. ✅ **Probar límites de descarga** → Deben ser ilimitados

## 📊 Base de Datos

### **Campos Agregados a la Tabla `users`:**
```sql
-- Ejecutar en Supabase SQL Editor:
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
```

### **Tabla `individual_purchases` (Ya existe):**
- Registra todos los pagos (Pro y Lifetime)
- Stripe session IDs para tracking
- Montos y tipos de pago

## 🔧 Desarrollo vs Producción

### **Desarrollo (Test Mode):**
- Usar claves `pk_test_...` y `sk_test_...`
- Webhooks apuntan a ngrok/localhost
- Solo tarjetas de prueba funcionan

### **Producción (Live Mode):**
- Cambiar a claves `pk_live_...` y `sk_live_...`
- Webhook apunta al dominio real
- Tarjetas reales son procesadas

## 🚨 Seguridad

### **Implementado:**
- ✅ **Verificación de signatures** en webhooks
- ✅ **Validación de usuario** en checkout sessions
- ✅ **Metadata tracking** para anti-fraude
- ✅ **Claves secretas** nunca expuestas al frontend

### **Best Practices:**
- Nunca hardcodear claves en el código
- Usar HTTPS en producción
- Validar todos los webhooks
- Registrar eventos importantes

## 📈 Monitoreo

### **Dashboard de Stripe:**
- **Payments** → Ver todos los pagos
- **Subscriptions** → Gestionar suscripciones Pro
- **Customers** → Ver clientes y su historial
- **Webhooks** → Logs de eventos procesados

### **Logs de la Aplicación:**
- Checkout sessions creadas
- Webhooks procesados
- Errores de pago
- Actualizaciones de plan

## 🔄 Webhooks Manejados

| Evento | Descripción | Acción |
|--------|-------------|--------|
| `checkout.session.completed` | Pago completado exitosamente | Actualizar plan del usuario |
| `invoice.payment_succeeded` | Renovación de suscripción | Confirmar plan Pro activo |
| `customer.subscription.deleted` | Suscripción cancelada | Downgrade a Freemium |

## 🆘 Troubleshooting

### **Errores Comunes:**

#### **"Invalid API Key"**
- Verificar que las claves estén correctas
- Asegurar que estás en el modo correcto (test/live)

#### **"No such price"**
- Verificar que los Price IDs están correctos
- Asegurar que los productos están activos

#### **"Webhook signature verification failed"**
- Verificar el webhook secret
- Asegurar que el endpoint está accesible

#### **"Payment not completed"**
- Usuario canceló el pago
- Problema con la tarjeta
- Revisar logs de Stripe

### **Debug Steps:**
1. **Verificar logs** del servidor (console.log)
2. **Revisar Stripe Dashboard** → Events
3. **Probar con tarjetas de prueba** diferentes
4. **Verificar variables de entorno**

## ✅ Checklist de Deployment

### **Antes de ir a producción:**
- [ ] Cuenta de Stripe activada y verificada
- [ ] Productos creados con precios correctos
- [ ] Webhook configurado en dominio de producción
- [ ] Variables de entorno de LIVE configuradas
- [ ] Testeo completo del flujo de pago
- [ ] Manejo de errores probado
- [ ] Monitoreo configurado

¡Tu sistema de pagos con Stripe está listo! 🎉 