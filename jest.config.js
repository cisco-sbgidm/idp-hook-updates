module.exports = {
  "testMatch": [
    "**/__tests__/**/*.[jt]s?(x)",
  ],
  "transform": {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
  "bail": true,
  "collectCoverage": true,
  "collectCoverageFrom": [
    "./src/*.ts"
  ],
  "coverageDirectory": "./build/reports/coverage",
  "coverageReporters": [
    "text",
    "text-summary",
    "html",
    "lcov"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 85,
      "lines": 85,
      "statements": 85
    }
  }
};
