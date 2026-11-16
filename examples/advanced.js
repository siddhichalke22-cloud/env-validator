require("dotenv").config();

const { validateEnv } = require("env-validator");

const env = validateEnv(
  {
    NODE_ENV: {
      type: "string",
      default: "development",
      enum: ["development", "test", "production"]
    },
    API_KEY: {
      type: "string",
      required: true,
      minLength: 24,
      message: "API_KEY must be at least 24 characters long."
    },
    SUPPORT_EMAIL: {
      type: "string",
      validate: (value) =>
        value.includes("@") || "SUPPORT_EMAIL must be a valid email address."
    }
  },
  { strict: false }
);

console.log(`Validated environment for ${env.NODE_ENV}`);
