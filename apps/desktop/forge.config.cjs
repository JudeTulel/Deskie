"use strict";

const path = require("path");
const QvacForgePlugin = require("@qvac/sdk/electron-forge");

module.exports = {
  packagerConfig: {
    name: "Deskmate",
    dir: path.resolve(__dirname),
    extraResource: [],
    nodeModulesPath: [
      path.resolve(__dirname, "../../node_modules"),
      path.resolve(__dirname, "node_modules")
    ],
    ignore: [
      /^\/src/,
      /^\/\.vite/,
      /^\/forge\.config/,
      /^\/node_modules\/.cache/,
      /^\/\.idea/,
      /^\/\.vscode/,
      /^\/\.git/,
      /^\/tsconfig/,
      /^\/eslint/
    ]
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin", "linux", "win32"]
    }
  ],
  plugins: [
    new QvacForgePlugin({
      logLevel: "info"
    })
  ]
};