# ⚡ Quick Start - Viajes EAD

Guía rápida para iniciar el proyecto localmente.

---

## 🚀 Primera Vez (Setup Inicial)

```bash
# 1. Instalar dependencias y compilar
npm run dev:setup

# 2. Copiar y configurar variables de entorno para Functions
cp firebase/functions/.env.example firebase/functions/.env
# Edita firebase/functions/.env con tus credenciales de Gmail

# 3. Listo! Continúa con "Uso Diario" ⬇️
```

---

## 📅 Uso Diario

### Opción 1: Script Automático

```bash
./start-dev.sh
```

### Opción 2: Manual

**Terminal 1 - Emulators:**
```bash
npm run dev:emulators
```

**Terminal 2 - Frontend:**
```bash
cd packages
npm run start

# O para web directamente:
npm run web
```

---

## 🌐 URLs Importantes

| Servicio | URL |
|----------|-----|
| **Emulator UI** | http://localhost:4000 |
| **Frontend (Expo)** | http://localhost:19006 |
| **Firestore** | http://localhost:8080 |
| **Auth** | http://localhost:9099 |
| **Functions** | http://localhost:5001 |

---

## 📝 Comandos Útiles

### Desarrollo

```bash
# Compilar Functions
npm run functions:build

# Compilar Functions en modo watch (auto-recompila)
cd firebase/functions && npm run build:watch

# Iniciar solo emulators
npm run dev:emulators

# Iniciar solo app
npm run dev:app
```

### Datos

```bash
# Inicializar datos de prueba en Firestore
# (con emulators corriendo)
npm run dev:init-data

# Exportar datos actuales del emulator
npm run dev:export-data
```

### Limpieza

```bash
# Reinstalar dependencias
rm -rf node_modules packages/node_modules firebase/functions/node_modules
npm install

# Limpiar caché de Expo
cd packages
npm start -- --clear
```

---

## 🧪 Usuarios de Prueba

Después de ejecutar `npm run dev:init-data`, tendrás estos usuarios:

| Email | Rol | Contraseña |
|-------|-----|------------|
| valentina.cartes.c@mail.pucv.cl | student | (configura en Auth UI) |
| daniel.segoviavega@gmail.com | student | (configura en Auth UI) |
| admin@viajes-ead.cl | admin | (configura en Auth UI) |
| validator@viajes-ead.cl | validator | (configura en Auth UI) |

Para configurar contraseñas:
1. Ve a http://localhost:4000/auth
2. Selecciona el usuario
3. Edita y agrega contraseña

---

## 🔧 Configuración de Variables de Entorno

### Frontend (`.env` en raíz)

```env
EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true
EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=localhost
EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT=8080
EXPO_PUBLIC_AUTH_EMULATOR_PORT=9099
EXPO_PUBLIC_FUNCTIONS_EMULATOR_PORT=5001
```

### Functions (`firebase/functions/.env`)

```env
CLIENT_ID=tu_client_id.apps.googleusercontent.com
CLIENT_SECRET=tu_client_secret
REFRESH_TOKEN=tu_refresh_token
USER_EMAIL=tu_email@gmail.com
```

---

## 🐛 Problemas Comunes

### "Port already in use"

```bash
# Encuentra el proceso
lsof -i :8080  # cambia el puerto según el error

# Mata el proceso
kill -9 <PID>
```

### "Java not found"

```bash
# Ubuntu/Debian
sudo apt install default-jdk

# macOS
brew install openjdk@11
```

### Functions no compilan

```bash
cd firebase/functions
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 📚 Documentación Completa

Para instrucciones detalladas, ver [SETUP_LOCAL.md](./SETUP_LOCAL.md)

---

¿Necesitas ayuda? Revisa los [issues](https://github.com/moduluxsoft-cl/viajes-ead/issues) o crea uno nuevo.
