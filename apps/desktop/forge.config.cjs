"use strict";

const path = require("path");

module.exports = {
  packagerConfig: {
    name: "Deskmate",
    dir: path.resolve(__dirname),
    extraResource: [],
    nodeModulesPath: [
      path.resolve(__dirname, "../../node_modules"),
      path.resolve(__dirname, "node_modules")
    ],
    asar: {
      unpack: "**/node_modules/@qvac/**/*"
    },
    ignore: [
      /^\/src/,
      /^\/\.vite/,
      /^\/forge\.config/,
      /^\/node_modules\/.cache/
    ]
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin", "linux", "win32"]
    }
  ]
};