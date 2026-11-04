const { validateEnv } = require("../src");
const { EnvironmentValidationError } = require("../src/errors");

const ENV_KEYS = [
  "ENV_VALIDATOR_TEST_STRING",
  "ENV_VALIDATOR_TEST_NUMBER",
  "ENV_VALIDATOR_TEST_URL",
  "ENV_VALIDATOR_TEST_MISSING",
  "ENV_VALIDATOR_TEST_EMPTY",
  "ENV_VALIDATOR_TEST_INVALID_NUMBER",
  "ENV_VALIDATOR_TEST_INVALID_URL"
];

describe("validateEnv", () => {
  const originalValues = {};

  beforeAll(() => {
    for (const key of ENV_KEYS) {
      originalValues[key] = process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
  });

  afterAll(() => {
    for (const key of ENV_KEYS) {
      if (originalValues[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalValues[key];
      }
    }
  });

  test("returns strings and validates URLs", () => {
    process.env.ENV_VALIDATOR_TEST_STRING = "secret";
    process.env.ENV_VALIDATOR_TEST_URL = "https://example.com";

    expect(validateEnv({
      ENV_VALIDATOR_TEST_STRING: { type: "string", required: true },
      ENV_VALIDATOR_TEST_URL: { type: "url", required: true }
    })).toEqual({
      ENV_VALIDATOR_TEST_STRING: "secret",
      ENV_VALIDATOR_TEST_URL: "https://example.com"
    });
  });

  test("converts a valid number to a number", () => {
    process.env.ENV_VALIDATOR_TEST_NUMBER = "3000";

    expect(validateEnv({
      ENV_VALIDATOR_TEST_NUMBER: { type: "number", required: true }
    })).toEqual({ ENV_VALIDATOR_TEST_NUMBER: 3000 });
  });

  test("omits an unset optional variable", () => {
    expect(validateEnv({
      ENV_VALIDATOR_TEST_MISSING: { type: "string" }
    })).toEqual({});
  });

  test("throws a custom error for a missing required variable", () => {
    expect(() => validateEnv({
      ENV_VALIDATOR_TEST_MISSING: { type: "string", required: true }
    })).toThrow(EnvironmentValidationError);

    try {
      validateEnv({
        ENV_VALIDATOR_TEST_MISSING: { type: "string", required: true }
      });
    } catch (error) {
      expect(error.variable).toBe("ENV_VALIDATOR_TEST_MISSING");
      expect(error.message).toBe(
        "Environment variable ENV_VALIDATOR_TEST_MISSING is required"
      );
    }
  });

  test("throws for an empty required variable", () => {
    process.env.ENV_VALIDATOR_TEST_EMPTY = "";

    expect(() => validateEnv({
      ENV_VALIDATOR_TEST_EMPTY: { required: true }
    })).toThrow(EnvironmentValidationError);
  });

  test("throws for an invalid number", () => {
    process.env.ENV_VALIDATOR_TEST_INVALID_NUMBER = "not-a-number";

    expect(() => validateEnv({
      ENV_VALIDATOR_TEST_INVALID_NUMBER: { type: "number" }
    })).toThrow("must be a number");
  });

  test("throws for an invalid URL", () => {
    process.env.ENV_VALIDATOR_TEST_INVALID_URL = "not-a-url";

    expect(() => validateEnv({
      ENV_VALIDATOR_TEST_INVALID_URL: { type: "url" }
    })).toThrow("must be a valid URL");
  });

  test("rejects an invalid schema", () => {
    expect(() => validateEnv(null)).toThrow(TypeError);
    expect(() => validateEnv([])).toThrow(TypeError);
  });
});