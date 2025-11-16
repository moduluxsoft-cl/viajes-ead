const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const projectRoot = __dirname;  // packages/
const monorepoRoot = path.resolve(projectRoot, '..');  // raíz del proyecto

// Configurar path aliases para que Metro los reconozca
config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    '@shared': path.resolve(projectRoot, 'src'),
    '@app': path.resolve(projectRoot, '.'),
    '@assets': path.resolve(projectRoot, 'assets'),
  },
  // Agregar node_modules de la raíz del monorepo
  nodeModulesPaths: [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(monorepoRoot, 'node_modules'),
  ],
  // Asegurar que Metro resuelva las extensiones correctas
  sourceExts: [...(config.resolver.sourceExts || []), 'ts', 'tsx', 'js', 'jsx'],
};

// Configurar watchFolders para que Metro observe cambios
config.watchFolders = [
  path.resolve(projectRoot, 'src'),
  path.resolve(projectRoot, 'assets'),
  path.resolve(projectRoot, 'app'),
  path.resolve(monorepoRoot, 'node_modules'),  // Observar node_modules raíz
];

module.exports = config;
