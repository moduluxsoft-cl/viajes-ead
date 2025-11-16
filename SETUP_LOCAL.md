# 🚀 Guía de Setup Local - Viajes EAD (Sin Docker)

Esta guía te ayudará a configurar y ejecutar el proyecto "Viajes EAD" completamente en tu entorno local usando Firebase Emulators.

---

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js**: Versión 18, 20 o 22 (recomendado: 22)
- **npm**: Versión 9 o superior
- **Java JDK**: Versión 11 o superior (requerido para Firebase Emulators)
- **Firebase CLI**: Se instalará automáticamente

### ✅ Verificar Requisitos

```bash
# Verificar Node.js
node -v
# Debería mostrar: v22.x.x o v20.x.x o v18.x.x

# Verificar npm
npm -v
# Debería mostrar: 9.x.x o superior

# Verificar Java
java -version
# Debería mostrar: openjdk version "11" o superior
```

---

## 📦 Paso 1: Instalación de Dependencias

### 1.1 Instalar Firebase CLI globalmente

```bash
npm install -g firebase-tools
```

Verifica la instalación:
```bash
firebase --version
# Debería mostrar: 13.x.x o superior
```

### 1.2 Instalar dependencias del proyecto

Desde la raíz del proyecto (`/home/user/viajes-ead`):

```bash
# Instalar todas las dependencias (root + workspaces)
npm install
```

Esto instalará automáticamente las dependencias de:
- Raíz del proyecto
- `packages/` (Frontend Expo)
- `firebase/functions/` (Cloud Functions)

---

## 🔧 Paso 2: Configuración de Variables de Entorno

### 2.1 Variables para Cloud Functions (Gmail OAuth) - **OPCIONAL**

> **📝 NOTA IMPORTANTE:** Estas credenciales son **DIFERENTES** al `firebaseConfig` del frontend.
>
> - **firebaseConfig** (en `packages/src/config/firebase.ts`): Conecta tu app React a Firebase (Auth, Firestore)
> - **Gmail OAuth** (este paso): Permite a las Cloud Functions enviar emails usando Gmail
>
> **¿Necesitas configurar esto?**
> - ✅ **SÍ** si vas a probar la función `enviarCorreoConQR` (envío de QR por email)
> - ❌ **NO** si solo trabajas con autenticación, Firestore, o el resto del sistema

Si **SÍ necesitas** enviar emails, crea el archivo `.env` en `firebase/functions/`:

```bash
# Desde la raíz del proyecto
touch firebase/functions/.env
```

Edita `firebase/functions/.env` y agrega tus credenciales de Gmail OAuth2:

```env
CLIENT_ID=tu_client_id_aqui.apps.googleusercontent.com
CLIENT_SECRET=tu_client_secret_aqui
REFRESH_TOKEN=tu_refresh_token_aqui
USER_EMAIL=tu_email@gmail.com
```

**Cómo obtener estas credenciales:**
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Habilita Gmail API
3. Crea credenciales OAuth 2.0
4. Usa [OAuth Playground](https://developers.google.com/oauth/playground/) para el refresh token

**⚠️ SEGURIDAD:**
- Estas credenciales permiten enviar emails desde tu cuenta de Gmail
- **NO** las subas a Git (ya protegido en `.gitignore`)
- Usa una cuenta de Gmail de prueba, no tu cuenta personal

**Si NO configuras esto:**
- La función `enviarCorreoConQR` devolverá un error controlado
- Todo lo demás funcionará perfectamente (Auth, Firestore, otras functions)

### 2.2 Verificar variables del frontend

El archivo `.env` en la raíz ya debería existir con:

```env
EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true
EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=localhost
EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT=8080
EXPO_PUBLIC_AUTH_EMULATOR_PORT=9099
EXPO_PUBLIC_PUBSUB_EMULATOR_PORT=8085
EXPO_PUBLIC_FUNCTIONS_EMULATOR_PORT=5001
APP_VERSION='DEV'
```

---

## 🗄️ Paso 3: Preparar Datos Iniciales del Emulator

Los datos de ejemplo ya están en `firebase/emulator-data/`. Estos datos incluyen:

- **Auth**: Usuarios de prueba pre-creados
- **Firestore**: Colecciones con el esquema de producción

Para verificar que existen:

```bash
ls -la firebase/emulator-data/
# Deberías ver: auth_export/ firestore_export/ firebase-export-metadata.json
```

---

## ⚙️ Paso 4: Compilar Cloud Functions

Antes de iniciar los emulators, compila las Cloud Functions:

```bash
# Opción 1: Desde la raíz
npm run functions:build

# Opción 2: Desde firebase/functions
cd firebase/functions
npm run build
cd ../..
```

Esto compilará TypeScript a JavaScript en `firebase/functions/lib/`.

---

## 🚀 Paso 5: Iniciar Firebase Emulators

### Opción A: Usando npm scripts (Recomendado)

Desde la raíz del proyecto:

```bash
# Iniciar todos los emulators (Auth, Firestore, Functions, Pubsub)
npm run qa:serve:all
```

### Opción B: Usando Firebase CLI directamente

```bash
cd firebase
firebase emulators:start --project viajes-ead --import=emulator-data
```

### Opción C: Solo Functions

```bash
npm run qa:serve:functions
```

---

## 📱 Paso 6: Iniciar la Aplicación Frontend (Expo)

Abre una **nueva terminal** (deja los emulators corriendo) y ejecuta:

```bash
# Desde la raíz del proyecto
cd packages
npm run start
```

Esto iniciará el servidor de desarrollo de Expo. Verás opciones para:
- Presionar `w` para abrir en el navegador web
- Presionar `a` para abrir en Android (requiere emulador)
- Presionar `i` para abrir en iOS (requiere simulador Mac)

**Para desarrollo web:**
```bash
cd packages
npm run web
```

---

## 🔍 Paso 7: Acceder a las Herramientas

Una vez que los emulators estén corriendo, tendrás acceso a:

| Servicio | URL | Descripción |
|----------|-----|-------------|
| **Emulator UI** | http://localhost:4000 | Panel de administración visual |
| **Firestore Emulator** | http://localhost:8080 | Base de datos |
| **Auth Emulator** | http://localhost:9099 | Autenticación |
| **Functions Emulator** | http://localhost:5001 | Cloud Functions |
| **Frontend (Expo)** | http://localhost:19006 | Aplicación web |

---

## 🗂️ Paso 8: Estructura de Datos en Firestore

El emulator ya tiene datos pre-cargados, pero aquí está el esquema completo:

### Colección: `auditoria_viajes`

```javascript
{
  carrera: "Ingeniería Informática",
  consolidado: false,
  destino: "Campus",
  email: "estudiante@mail.pucv.cl",
  esAnomalia: false,
  estadoUso: "SIN_USO",
  estudianteId: "usuario123",
  fechaGeneracion: Timestamp,
  fechaViaje: Timestamp,
  nombreCompleto: "Nombre Apellido",
  paseId: "pase-111-222",
  rut: "12.345.678-9",
  tripNumber: 101,
  validacionIda: {
    horaValidacion: Timestamp,
    validado: false
  },
  validacionVuelta: {
    horaValidacion: Timestamp,
    validado: false
  },
  viajeId: "viaje-abc-123"
}
```

### Colección: `counters`

```javascript
// Documento: viajes_counter
{
  currentNumber: 25
}
```

### Colección: `properties`

```javascript
// Carreras disponibles
{ name: "CARRERA", value: "Arquitectura" }
{ name: "CARRERA", value: "Diseño" }
{ name: "CARRERA", value: "Diseño Industrial" }
{ name: "CARRERA", value: "Programa de Movilidad Estudiantil (PME)" }

// Configuraciones
{ name: "MAX_TICKET_USES", value: 2 }
{ name: "MAX_CAPACITY", value: 250 }
```

### Colección: `users`

```javascript
{
  activo: true,
  apellido: "APELLIDO",
  carrera: "Arquitectura",
  email: "estudiante@mail.pucv.cl",
  fechaCreacion: Timestamp,
  nombre: "NOMBRE",
  role: "student", // Puede ser: "student", "validator", "admin"
  rut: "12.345.678-9"
}
```

### Colección: `viajes`

```javascript
// Documento: viajes-1, viajes-2, etc.
{
  DATE_TRAVEL: Timestamp,
  DESTINATION: "Ciudad Abierta, Ritoque",
  GENERATED_PASSES: 0,
  MAX_CAPACITY: 208,
  STATE: "ABIERTO", // o "CERRADO"
  TRIP_NUMBER: 22
}
```

---

## 🧪 Paso 9: Probar la Aplicación

### 9.1 Crear un usuario de prueba

1. Abre la Emulator UI: http://localhost:4000
2. Ve a **Authentication**
3. Crea un nuevo usuario o usa uno pre-cargado
4. Anota el email y contraseña

### 9.2 Iniciar sesión en la app

1. Abre la aplicación: http://localhost:19006
2. Inicia sesión con las credenciales creadas
3. Explora las funcionalidades

---

## 🛠️ Comandos Útiles

### Desarrollo

```bash
# Ver logs de Cloud Functions
cd firebase/functions
npm run serve

# Compilar Functions en modo watch (auto-recompila)
cd firebase/functions
npm run build:watch

# Limpiar y reinstalar todo
rm -rf node_modules packages/node_modules firebase/functions/node_modules
npm install
```

### Emulators

```bash
# Exportar datos del emulator (guardar cambios)
firebase emulators:export firebase/emulator-data --project viajes-ead

# Limpiar datos del emulator (volver a estado inicial)
rm -rf firebase/emulator-data
firebase emulators:start --project viajes-ead --export-on-exit=firebase/emulator-data
```

### Debugging

```bash
# Ver estado de los puertos
lsof -i :4000,8080,9099,5001

# Matar proceso en un puerto específico
kill -9 $(lsof -t -i:4000)
```

---

## 🐛 Solución de Problemas

### Problema: "Firebase emulators no inician"

**Solución:**
```bash
# Verificar que Java esté instalado
java -version

# Si no está instalado (Ubuntu/Debian)
sudo apt install default-jdk

# Si no está instalado (Mac)
brew install openjdk@11
```

### Problema: "Puerto ya en uso"

**Solución:**
```bash
# Encontrar y matar el proceso
lsof -i :8080  # Reemplaza con el puerto problemático
kill -9 <PID>
```

### Problema: "Cloud Functions no compilan"

**Solución:**
```bash
cd firebase/functions
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Problema: "Frontend no conecta al emulator"

**Solución:**
1. Verifica que `packages/src/config/firebase.ts` tenga `useEmulators = true`
2. Reinicia el servidor de Expo
3. Limpia la caché: `cd packages && npm start -- --clear`

---

## 📚 Recursos Adicionales

- [Documentación Firebase Emulators](https://firebase.google.com/docs/emulator-suite)
- [Expo Documentation](https://docs.expo.dev/)
- [Firebase Functions](https://firebase.google.com/docs/functions)

---

## 🎯 Flujo de Trabajo Recomendado

1. **Primera vez:**
   ```bash
   npm install
   npm run functions:build
   npm run qa:serve:all
   # En otra terminal:
   cd packages && npm run web
   ```

2. **Día a día:**
   ```bash
   npm run qa:serve:all
   # En otra terminal:
   cd packages && npm run start
   ```

3. **Antes de hacer commit:**
   ```bash
   npm run functions:typecheck
   npm run functions:build
   ```

---

¡Listo! Ahora tienes todo configurado para desarrollar localmente. 🎉
