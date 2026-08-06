const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite usa WebAssembly no navegador.
config.resolver.assetExts.push('wasm');

module.exports = config;
