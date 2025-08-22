const path = require('path');

module.exports = {
  packagerConfig: {
    asar: { unpackDir: '**/*.node' },
    // Optional app icon. Provide assets/icon.icns, assets/icon.ico, assets/icon.png
    icon: path.resolve(__dirname, 'assets', 'icon')
  },
  rebuildConfig: {},
  makers: [
    // Windows
    { name: '@electron-forge/maker-squirrel', platforms: ['win32'], config: {} },

    // macOS
    { name: '@electron-forge/maker-dmg', platforms: ['darwin'], config: { format: 'ULFO' } },
    { name: '@electron-forge/maker-zip', platforms: ['darwin'] },

    // Linux
    { name: '@reforged/maker-appimage' },
    { name: '@electron-forge/maker-deb', platforms: ['linux'], config: {} },
    { name: '@electron-forge/maker-rpm', platforms: ['linux'], config: {} }
  ]
};
