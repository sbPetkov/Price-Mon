const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Disable package.json:exports support
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
