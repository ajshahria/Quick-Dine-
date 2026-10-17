export default {
  testEnvironment:"node", testMatch:["<rootDir>/tests/**/*.test.mjs"], transform:{},
  testTimeout:120000,
  collectCoverageFrom:["dist/app.js", "dist/controllers/**/*.js", "dist/middlewares/**/*.js", "dist/lib/**/*.js", "dist/services/**/*.js", "dist/models/**/*.js", "dist/routes/**/*.js", "dist/config/**/*.js"],
  coverageProvider:"v8", coverageReporters:["text", "html", "lcov", "json-summary"],
  coverageThreshold:{global:{statements:80,lines:80,functions:80,branches:75}},
};
