'use strict';
const tsconfig = require("./tsconfig.json");

const baseConfig = require('../../jest.config');

module.exports = {
  ...baseConfig,
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"]
};
