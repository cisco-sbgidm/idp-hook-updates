'use strict';
const tsconfig = require("./tsconfig.json");

const baseConfig = require('../../../jest.config');

module.exports = {
  ...baseConfig,
  collectCoverage: false,
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"]
};

