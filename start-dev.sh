#!/bin/bash

# Script de inicio rápido para desarrollo local de Viajes EAD
# Uso: ./start-dev.sh

set -e

echo "🚀 Iniciando Viajes EAD en modo desarrollo local"
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar Node.js
echo -e "${BLUE}📦 Verificando requisitos...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js: $(node -v)${NC}"

# Verificar Java
if ! command -v java &> /dev/null; then
    echo -e "${RED}❌ Java no está instalado (requerido para Firebase Emulators)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Java: $(java -version 2>&1 | head -n 1)${NC}"

# Verificar Firebase CLI
if ! command -v firebase &> /dev/null; then
    echo -e "${YELLOW}⚠️  Firebase CLI no está instalado. Instalando...${NC}"
    npm install -g firebase-tools
fi
echo -e "${GREEN}✓ Firebase CLI: $(firebase --version)${NC}"

echo ""

# Verificar si las dependencias están instaladas
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Instalando dependencias...${NC}"
    npm install
fi

# Verificar archivo .env para functions
if [ ! -f "firebase/functions/.env" ]; then
    echo -e "${YELLOW}⚠️  Archivo firebase/functions/.env no encontrado${NC}"
    echo -e "${YELLOW}   Copiando desde .env.example...${NC}"
    if [ -f "firebase/functions/.env.example" ]; then
        cp firebase/functions/.env.example firebase/functions/.env
        echo -e "${YELLOW}   ⚠️  Por favor edita firebase/functions/.env con tus credenciales${NC}"
    fi
fi

# Compilar functions
echo -e "${BLUE}🔧 Compilando Cloud Functions...${NC}"
npm run functions:build

echo ""
echo -e "${GREEN}✅ Todo listo!${NC}"
echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  COMANDOS DISPONIBLES${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo -e "${YELLOW}Terminal 1 - Emulators:${NC}"
echo "  npm run dev:emulators"
echo ""
echo -e "${YELLOW}Terminal 2 - Frontend:${NC}"
echo "  cd packages && npm run start"
echo "  (o para web directamente: npm run web)"
echo ""
echo -e "${YELLOW}Acceso a servicios:${NC}"
echo "  Emulator UI:  http://localhost:4000"
echo "  Frontend:     http://localhost:19006"
echo "  Firestore:    http://localhost:8080"
echo "  Auth:         http://localhost:9099"
echo ""
echo -e "${BLUE}================================${NC}"
echo ""

# Preguntar si quiere iniciar automáticamente
read -p "¿Quieres iniciar los emulators ahora? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}🚀 Iniciando Firebase Emulators...${NC}"
    npm run dev:emulators
fi
