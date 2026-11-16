require("dotenv").config();

const { validateEnv } = require("env-validator");

const env = validateEnv({
  PORT: { type: "number", required: true, min: 1, max: 65535 },
  DATABASE_URL: { type: "url", required: true },
  JWT_SECRET: { type: "string", required: true },
  DEBUG: { type: "boolean", default: false }
});

console.log(`Starting on port ${env.PORT}; debug=${env.DEBUG}`);
