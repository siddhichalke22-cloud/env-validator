const { EnvironmentValidationError } = require("./errors");
const { typeValidators } = require("./validators");

const knownRuleKeys = new Set([
  "type",
  "required",
  "default",
  "message",
  "requiredMessage",
  "min",
  "max",
  "enum",
  "minLength",
  "maxLength",
  "validate"
]);

function assertBound(name, option, value, { integer = false } = {}) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    (integer && (!Number.isInteger(value) || value < 0))
  ) {
    const expected = integer ? "a non-negative integer" : "a finite number";
    throw new TypeError(`The ${option} option for ${name} must be ${expected}`);
  }
}

function validateRules(name, rules) {
  if (rules === null || typeof rules !== "object" || Array.isArray(rules)) {
    throw new TypeError(`Validation rules for ${name} must be an object`);
  }

  const { type = "string", required = false } = rules;
  if (typeof required !== "boolean") {
    throw new TypeError(`The required option for ${name} must be a boolean`);
  }
  if (!Object.hasOwn(typeValidators, type)) {
    throw new TypeError(`Unsupported type "${type}" for ${name}`);
  }
  if (rules.message !== undefined && typeof rules.message !== "string") {
    throw new TypeError(`The message option for ${name} must be a string`);
  }
  if (
    rules.requiredMessage !== undefined &&
    typeof rules.requiredMessage !== "string"
  ) {
    throw new TypeError(`The requiredMessage option for ${name} must be a string`);
  }
  if (
    rules.enum !== undefined &&
    (!Array.isArray(rules.enum) || rules.enum.length === 0)
  ) {
    throw new TypeError(`The enum option for ${name} must be a non-empty array`);
  }
  if (rules.validate !== undefined && typeof rules.validate !== "function") {
    throw new TypeError(`The validate option for ${name} must be a function`);
  }

  for (const option of ["min", "max"]) {
    if (rules[option] !== undefined) {
      assertBound(name, option, rules[option]);
    }
  }
  for (const option of ["minLength", "maxLength"]) {
    if (rules[option] !== undefined) {
      assertBound(name, option, rules[option], { integer: true });
    }
  }
  if (rules.min !== undefined && rules.max !== undefined && rules.min > rules.max) {
    throw new TypeError(`The min option for ${name} cannot be greater than max`);
  }
  if (
    rules.minLength !== undefined &&
    rules.maxLength !== undefined &&
    rules.minLength > rules.maxLength
  ) {
    throw new TypeError(
      `The minLength option for ${name} cannot be greater than maxLength`
    );
  }
  if (
    (rules.min !== undefined || rules.max !== undefined) &&
    type !== "number"
  ) {
    throw new TypeError(`The min and max options for ${name} require type "number"`);
  }
  if (
    (rules.minLength !== undefined || rules.maxLength !== undefined) &&
    type !== "string"
  ) {
    throw new TypeError(
      `The minLength and maxLength options for ${name} require type "string"`
    );
  }

  for (const option of Object.keys(rules)) {
    if (!knownRuleKeys.has(option)) {
      throw new TypeError(`Unknown validation option "${option}" for ${name}`);
    }
  }

  return { type, required };
}

function validateValue(name, value, rules, type) {
  const parsed = typeValidators[type](value);

  if (type === "number") {
    if (rules.min !== undefined && parsed < rules.min) {
      throw new TypeError(`Expected a number greater than or equal to ${rules.min}`);
    }
    if (rules.max !== undefined && parsed > rules.max) {
      throw new TypeError(`Expected a number less than or equal to ${rules.max}`);
    }
  }
  if (type === "string") {
    if (rules.minLength !== undefined && parsed.length < rules.minLength) {
      throw new TypeError(
        `Expected a string with at least ${rules.minLength} characters`
      );
    }
    if (rules.maxLength !== undefined && parsed.length > rules.maxLength) {
      throw new TypeError(
        `Expected a string with at most ${rules.maxLength} characters`
      );
    }
  }
  if (rules.enum !== undefined && !rules.enum.includes(parsed)) {
    throw new TypeError(`Expected one of: ${rules.enum.map(String).join(", ")}`);
  }
  if (rules.validate !== undefined) {
    const result = rules.validate(parsed);
    if (result !== true) {
      if (typeof result === "string" && result.length > 0) {
        throw new TypeError(result);
      }
      if (result !== false) {
        throw new TypeError(
          `Custom validation for ${name} must return true, false, or an error message`
        );
      }
      throw new TypeError("Custom validation failed");
    }
  }

  return parsed;
}

function validateEnv(schema, options = {}) {
  if (schema === null || typeof schema !== "object" || Array.isArray(schema)) {
    throw new TypeError("Environment schema must be an object");
  }
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("Validation options must be an object");
  }
  if (options.strict !== undefined && typeof options.strict !== "boolean") {
    throw new TypeError("The strict option must be a boolean");
  }
  for (const option of Object.keys(options)) {
    if (option !== "strict") {
      throw new TypeError(`Unknown validation option "${option}"`);
    }
  }

  const validated = {};
  const errors = [];
  const names = Object.keys(schema);

  for (const name of names) {
    const rules = schema[name];
    const { type, required } = validateRules(name, rules);
    const hasEnvironmentValue = process.env[name] !== undefined;
    const rawValue = hasEnvironmentValue ? process.env[name] : rules.default;

    if (!hasEnvironmentValue && rules.default === undefined) {
      if (required) {
        errors.push({
          name,
          message:
            rules.requiredMessage ||
            rules.message ||
            "Required environment variable is missing."
        });
      }
      continue;
    }

    if (required && rawValue === "") {
      errors.push({
        name,
        message:
          rules.requiredMessage ||
          rules.message ||
          "Required environment variable is missing."
      });
      continue;
    }

    try {
      const value = validateValue(name, rawValue, rules, type);
      Object.defineProperty(validated, name, {
        configurable: true,
        enumerable: true,
        value,
        writable: true
      });
    } catch (error) {
      if (!(error instanceof TypeError)) {
        throw error;
      }

      errors.push({
        name,
        message: rules.message || error.message
      });
    }
  }

  if (options.strict) {
    const declared = new Set(names);
    for (const name of Object.keys(process.env)) {
      if (!declared.has(name)) {
        errors.push({
          name,
          message: "Unexpected environment variable."
        });
      }
    }
  }

  if (errors.length > 0) {
    throw new EnvironmentValidationError(errors);
  }

  return validated;
}

module.exports = { validateEnv };
