# 🔐 Configuración y Credenciales - Viajes EAD

Este documento explica las diferentes configuraciones y credenciales que usa el proyecto.

---

## 📊 **Resumen de Configuraciones**

| Configuración | Ubicación | Propósito | ¿Obligatorio? |
|---------------|-----------|-----------|---------------|
| **Firebase Config** | `packages/src/config/firebase.ts` | Conectar frontend a Firebase | ✅ SÍ |
| **Emulator Env** | `.env` (raíz) | Configurar emulators locales | ✅ SÍ (para desarrollo local) |
| **Gmail OAuth** | `firebase/functions/.env` | Enviar emails desde Cloud Functions | ❌ NO (solo para función de emails) |

---

## 1️⃣ **Firebase Config (Frontend)**

### **Archivo:** `packages/src/config/firebase.ts`

```typescript
export const firebaseConfig = {
    apiKey: "AIzaSyCo_eMk6NrQEqMB757fgU3FpMjLwBhfI9w",
    authDomain: "viajes-ead.firebaseapp.com",
    projectId: "viajes-ead",
    storageBucket: "viajes-ead.firebasestorage.app",
    messagingSenderId: "211543185187",
    appId: "1:211543185187:web:16c8dfa8aec492cee1de96",
    measurementId: "G-DTL2C48CB5"
};
```

### **¿Para qué sirve?**
- Conectar la **aplicación React** a Firebase
- Permite usar Firebase Auth (login de usuarios)
- Permite usar Firestore (base de datos)
- Permite llamar Cloud Functions desde el frontend

### **¿Dónde se usa?**
- `packages/src/config/firebase.ts:21` - `initializeApp(firebaseConfig)`
- Se exporta y se usa en toda la aplicación

### **¿Necesitas cambiarla?**
- ❌ **NO** - Ya está configurada correctamente
- ✅ Es la misma para desarrollo y producción
- ✅ Es seguro compartirla públicamente (no es secreta)

---

## 2️⃣ **Emulator Config (Desarrollo Local)**

### **Archivo:** `.env` (raíz del proyecto)

```env
EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true
EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=localhost
EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT=8080
EXPO_PUBLIC_AUTH_EMULATOR_PORT=9099
EXPO_PUBLIC_PUBSUB_EMULATOR_PORT=8085
EXPO_PUBLIC_FUNCTIONS_EMULATOR_PORT=5001
APP_VERSION='DEV'
```

### **¿Para qué sirve?**
- Configurar la conexión a Firebase Emulators locales
- Redirigir Auth, Firestore y Functions al emulator en vez de producción
- Evitar que el desarrollo local afecte datos de producción

### **¿Dónde se usa?**
- `packages/src/config/firebase.ts:34` - Lee `EXPO_PUBLIC_USE_FIREBASE_EMULATORS`
- Si es `true`, conecta a emulators en `localhost`
- Si es `false`, conecta a Firebase producción

### **¿Necesitas cambiarla?**
- ❌ **NO** para desarrollo local estándar
- ✅ Puedes cambiar puertos si hay conflictos
- ✅ Cambia `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=false` para usar producción

---

## 3️⃣ **Gmail OAuth (Cloud Functions) - OPCIONAL**

### **Archivo:** `firebase/functions/.env` (debes crearlo)

```env
CLIENT_ID=tu_client_id.apps.googleusercontent.com
CLIENT_SECRET=tu_client_secret
REFRESH_TOKEN=tu_refresh_token
USER_EMAIL=tu_email@gmail.com
```

### **¿Para qué sirve?**
- Permitir que la Cloud Function `enviarCorreoConQR` envíe emails
- Usa **Nodemailer** con Gmail SMTP
- Envía el código QR por correo a los estudiantes

### **¿Dónde se usa?**
- `firebase/functions/src/index.ts:18-21` - Lee las variables
- `firebase/functions/src/index.ts:143-158` - Configura el transporter de Nodemailer
- Solo en la función `enviarCorreoConQR`

### **¿Necesitas configurarla?**

**✅ SÍ, si:**
- Vas a probar el flujo completo de generación de pases con email
- Estás desarrollando/debuggeando la función `enviarCorreoConQR`
- Necesitas que los estudiantes reciban el QR por correo

**❌ NO, si:**
- Solo trabajas con autenticación de usuarios
- Solo trabajas con Firestore (CRUD de viajes, pases, usuarios)
- Estás desarrollando el frontend
- Estás trabajando en otras Cloud Functions (deleteUser, etc.)

### **¿Qué pasa si NO la configuras?**
```typescript
// La función fallará con este error controlado:
if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !USER_EMAIL) {
    throw new HttpsError("internal", "El servidor no está configurado para enviar correos.");
}
```

- ✅ Todo lo demás funciona perfectamente
- ❌ Solo la función `enviarCorreoConQR` fallará

---

## 🔍 **Diferencias Clave**

### **Firebase Config vs Gmail OAuth**

| Aspecto | Firebase Config | Gmail OAuth |
|---------|----------------|-------------|
| **Propósito** | Conectar app a Firebase | Enviar emails desde Functions |
| **Ubicación** | Frontend (código fuente) | Backend (Cloud Functions) |
| **Tecnología** | Firebase SDK | Nodemailer + Gmail SMTP |
| **Servicios** | Auth, Firestore, Functions | Solo envío de correos |
| **¿Es secreta?** | ❌ No (pública en código) | ✅ SÍ (credenciales OAuth) |
| **¿Obligatoria?** | ✅ SÍ (siempre) | ❌ NO (solo para emails) |

### **Flujo Completo de Envío de Email**

```
1. Usuario genera pase (Frontend)
   ↓ usa firebaseConfig

2. Frontend llama función enviarCorreoConQR
   ↓ usa firebaseConfig

3. Cloud Function recibe petición
   ↓ usa Gmail OAuth (CLIENT_ID, etc.)

4. Nodemailer se conecta a Gmail SMTP
   ↓ usa Gmail OAuth

5. Se envía el email con QR
   ✅ Email enviado
```

**Si falta Gmail OAuth:**
- Pasos 1-3: ✅ Funcionan
- Paso 4: ❌ Falla (no hay credenciales)
- Paso 5: ❌ No se envía email

---

## 📝 **Guía Rápida de Setup**

### **Para desarrollo básico (sin emails):**

```bash
# 1. Instalar dependencias
npm install

# 2. Compilar functions
npm run functions:build

# 3. Iniciar emulators
npm run dev:emulators

# 4. Iniciar app (en otra terminal)
cd packages && npm run start
```

✅ **Listo!** Puedes trabajar con:
- Autenticación de usuarios
- Firestore (crear/editar viajes, pases, usuarios)
- Todas las vistas del frontend
- Cloud Function `deleteUser`

### **Para desarrollo completo (con emails):**

```bash
# Pasos anteriores +

# 5. Configurar Gmail OAuth
cp firebase/functions/.env.example firebase/functions/.env
# Edita firebase/functions/.env con tus credenciales de Gmail

# 6. Reiniciar emulators
npm run dev:emulators
```

✅ **Ahora también funciona:**
- Envío de QR por email
- Función `enviarCorreoConQR`

---

## 🆘 **Preguntas Frecuentes**

### **¿Puedo usar firebaseConfig para enviar emails?**

❌ No. `firebaseConfig` solo conecta el frontend a Firebase. Para enviar emails necesitas:
- Gmail OAuth credentials (CLIENT_ID, etc.)
- Configuradas en `firebase/functions/.env`

### **¿Por qué no usar Firebase para enviar emails?**

Firebase no tiene un servicio nativo de envío de emails. Las opciones son:
1. **Nodemailer + Gmail** (actual) - Más control, requiere OAuth
2. **SendGrid** - Servicio de terceros
3. **Firebase Extensions** - Limitado

El proyecto usa Nodemailer porque ofrece mayor flexibilidad.

### **¿Las credenciales de Gmail son seguras?**

✅ SÍ, si:
- Usas una cuenta de Gmail de **prueba/desarrollo**
- **NO** subes `firebase/functions/.env` a Git
- Rotas las credenciales periódicamente

❌ NO, si:
- Usas tu cuenta personal de Gmail
- Subes el archivo `.env` a Git (público)

---

## 📚 **Recursos Adicionales**

- [Firebase Config Docs](https://firebase.google.com/docs/web/setup)
- [Firebase Emulators](https://firebase.google.com/docs/emulator-suite)
- [Nodemailer OAuth2](https://nodemailer.com/smtp/oauth2/)
- [Google OAuth Playground](https://developers.google.com/oauth/playground/)

---

¿Tienes más dudas? Revisa [SETUP_LOCAL.md](./SETUP_LOCAL.md) o [QUICK_START.md](./QUICK_START.md)
