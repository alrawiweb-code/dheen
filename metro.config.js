// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const flashListDist = path.resolve(
  __dirname,
  'node_modules/@shopify/flash-list/dist'
);

// Add WASM support for expo-sqlite on web
config.resolver.assetExts.push('wasm');

// Fix: After SDK 51→54 upgrade, Metro can't resolve relative imports inside
// @shopify/flash-list/dist/index.js (e.g. "./benchmark/useDataMultiplier").
// We intercept those specific requests and redirect to the correct absolute path.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('./benchmark/') && context.originModulePath.includes('@shopify/flash-list')) {
    const filename = moduleName.replace('./benchmark/', '') + '.js';
    return {
      filePath: path.join(flashListDist, 'benchmark', filename),
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
