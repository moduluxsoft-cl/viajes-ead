const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Configurar path aliases para que Metro los reconozca
config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    '@shared': path.resolve(__dirname, 'src'),
    '@app': path.resolve(__dirname, '.'),
    '@assets': path.resolve(__dirname, 'assets'),
  },
  // Asegurar que Metro resuelva las extensiones correctas
  sourceExts: [...(config.resolver.sourceExts || []), 'ts', 'tsx', 'js', 'jsx'],
};

// Configurar watchFolders para que Metro observe cambios en src/
config.watchFolders = [
  path.resolve(__dirname, 'src'),
  path.resolve(__dirname, 'assets'),
  path.resolve(__dirname, 'app'),
];

module.exports = config;
