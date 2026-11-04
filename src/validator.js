const { EnvironmentValidationError } = require("./errors");

function validateEnv(schema) {
  if (schema === null || typeof schema !== "object" || Array.isArray(schema)) {
    throw new TypeError("Environment schema must be an object");
  }

  const config = {};

  for (const [name, rules] of Object.entries(schema)) {
    if (rules === null || typeof rules !== "object" || Array.isArray(rules)) {
      throw new TypeError(`Validation rules for ${name} must be an object`);
    }

    const { type = "string", required = false } = rules;

    if (typeof required !== "boolean") {
      throw new TypeError(`The required option for ${name} must be a boolean`);
    }

    if (!["string", "number", "url"].includes(type)) {
      throw new TypeError(`Unsupported type "${type}" for ${name}`);
    }

    const value = process.env[name];

    if (value === undefined || (required && value === "")) {
      if (required) {
        throw new EnvironmentValidationError(
          `Environment variable ${name} is required`,
          name
        );
      }

      continue;
    }

    if (type === "number") {
      if (value.trim() === "") {
        throw new EnvironmentValidationError(
          `Environment variable ${name} must be a number`,
          name
        );
      }

      const number = Number(value);
      if (!Number.isFinite(number)) {
        throw new EnvironmentValidationError(
          `Environment variable ${name} must be a number`,
          name
        );
      }

      config[name] = number;
      continue;
    }

    if (type === "url") {
      try {
        new URL(value);
      } catch {
        throw new EnvironmentValidationError(
          `Environment variable ${name} must be a valid URL`,
          name
        );
      }
    }

    config[name] = value;
  }

  return config;
}

module.exports = { validateEnv };