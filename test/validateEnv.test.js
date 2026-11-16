const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  validateEnv,
  EnvironmentValidationError
} = require("../src");

const ENV_KEYS = [
  "ENV_VALIDATOR_TEST_STRING",
  "ENV_VALIDATOR_TEST_NUMBER",
  "ENV_VALIDATOR_TEST_BOOLEAN",
  "ENV_VALIDATOR_TEST_URL",
  "ENV_VALIDATOR_TEST_REQUIRED_A",
  "ENV_VALIDATOR_TEST_REQUIRED_B",
  "ENV_VALIDATOR_TEST_DEFAULT",
  "ENV_VALIDATOR_TEST_OPTIONAL",
  "ENV_VALIDATOR_TEST_RANGE",
  "ENV_VALIDATOR_TEST_ENUM",
  "ENV_VALIDATOR_TEST_LENGTH",
  "ENV_VALIDATOR_TEST_CUSTOM",
  "ENV_VALIDATOR_TEST_CUSTOM_MESSAGE",
  "ENV_VALIDATOR_TEST_CUSTOM_THROW",
  "ENV_VALIDATOR_TEST_EXTRA"
];

function captureError(callback) {
  try {
    callback();
  } catch (error) {
    return error;
  }
  assert.fail("Expected validation to fail");
}

function isolatedTest(name, callback) {
  test(name, () => {
    const originals = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
    try {
      callback();
    } finally {
      for (const [key, value] of originals) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  });
}

isolatedTest("validates and converts every supported type", () => {
    process.env.ENV_VALIDATOR_TEST_STRING = "secret";
    process.env.ENV_VALIDATOR_TEST_NUMBER = "3000";
    process.env.ENV_VALIDATOR_TEST_BOOLEAN = "true";
    process.env.ENV_VALIDATOR_TEST_URL = "https://example.com";

    assert.deepEqual(
      validateEnv({
        ENV_VALIDATOR_TEST_STRING: { type: "string", required: true },
        ENV_VALIDATOR_TEST_NUMBER: { type: "number", required: true },
        ENV_VALIDATOR_TEST_BOOLEAN: { type: "boolean", required: true },
        ENV_VALIDATOR_TEST_URL: { type: "url", required: true }
      }),
      {
        ENV_VALIDATOR_TEST_STRING: "secret",
        ENV_VALIDATOR_TEST_NUMBER: 3000,
        ENV_VALIDATOR_TEST_BOOLEAN: true,
        ENV_VALIDATOR_TEST_URL: "https://example.com"
      }
    );
});

isolatedTest("collects missing required variables in one readable error", () => {
    const error = captureError(() =>
      validateEnv({
        ENV_VALIDATOR_TEST_REQUIRED_A: { required: true },
        ENV_VALIDATOR_TEST_REQUIRED_B: { type: "number", required: true }
      })
    );

    assert.ok(error instanceof EnvironmentValidationError);
    assert.equal(error.errors.length, 2);
    assert.match(
      error.message,
      /- ENV_VALIDATOR_TEST_REQUIRED_A: Required environment variable is missing\./
    );
    assert.match(error.message, /Please check your \.env file\./);
});

isolatedTest("rejects invalid numbers, booleans, and URLs", () => {
    const invalidCases = [
      ["number", "not-a-number", "ENV_VALIDATOR_TEST_NUMBER"],
      ["boolean", "yes", "ENV_VALIDATOR_TEST_BOOLEAN"],
      ["url", "not-a-url", "ENV_VALIDATOR_TEST_URL"]
    ];

    for (const [type, value, name] of invalidCases) {
      process.env[name] = value;
      assert.throws(
        () => validateEnv({ [name]: { type } }),
        EnvironmentValidationError
      );
      delete process.env[name];
    }
});

isolatedTest("applies defaults only when the environment value is missing", () => {
    process.env.ENV_VALIDATOR_TEST_DEFAULT = "true";

    assert.deepEqual(
      validateEnv({
        ENV_VALIDATOR_TEST_DEFAULT: { type: "boolean", default: false },
        ENV_VALIDATOR_TEST_BOOLEAN: { type: "number", default: 3000 }
      }),
      {
        ENV_VALIDATOR_TEST_DEFAULT: true,
        ENV_VALIDATOR_TEST_BOOLEAN: 3000
      }
    );
    assert.equal(process.env.ENV_VALIDATOR_TEST_DEFAULT, "true");
    assert.equal(process.env.ENV_VALIDATOR_TEST_BOOLEAN, undefined);
});

isolatedTest("omits an unset optional value", () => {
    assert.deepEqual(
      validateEnv({ ENV_VALIDATOR_TEST_OPTIONAL: { type: "string" } }),
      {}
    );
});

isolatedTest("enforces numeric minimum and maximum values", () => {
    process.env.ENV_VALIDATOR_TEST_RANGE = "10";
    assert.equal(
      validateEnv({
        ENV_VALIDATOR_TEST_RANGE: { type: "number", min: 1, max: 10 }
      }).ENV_VALIDATOR_TEST_RANGE,
      10
    );

    process.env.ENV_VALIDATOR_TEST_RANGE = "11";
    assert.throws(
      () =>
        validateEnv({
          ENV_VALIDATOR_TEST_RANGE: { type: "number", min: 1, max: 10 }
        }),
      /less than or equal to 10/
    );
});

isolatedTest("supports allowed values and string length bounds", () => {
    process.env.ENV_VALIDATOR_TEST_ENUM = "production";
    process.env.ENV_VALIDATOR_TEST_LENGTH = "valid-secret";

    assert.equal(
      validateEnv({
        ENV_VALIDATOR_TEST_ENUM: {
          type: "string",
          enum: ["development", "production"]
        },
        ENV_VALIDATOR_TEST_LENGTH: {
          type: "string",
          minLength: 8,
          maxLength: 20
        }
      }).ENV_VALIDATOR_TEST_ENUM,
      "production"
    );

    process.env.ENV_VALIDATOR_TEST_ENUM = "staging";
    assert.throws(
      () =>
        validateEnv({
          ENV_VALIDATOR_TEST_ENUM: { enum: ["development", "production"] }
        }),
      /Expected one of: development, production/
    );
});

isolatedTest("uses custom validation functions and custom messages", () => {
    process.env.ENV_VALIDATOR_TEST_CUSTOM = "not-an-email";
    assert.throws(
      () =>
        validateEnv({
          ENV_VALIDATOR_TEST_CUSTOM: {
            validate: (value) => value.includes("@") || "Must be an email address"
          }
        }),
      /Must be an email address/
    );

    assert.throws(
      () =>
        validateEnv({
          ENV_VALIDATOR_TEST_CUSTOM_MESSAGE: {
            required: true,
            requiredMessage: "Set this in your local environment."
          }
        }),
      /Set this in your local environment\./
    );

    process.env.ENV_VALIDATOR_TEST_CUSTOM_THROW = "value";
    assert.throws(
      () =>
        validateEnv({
          ENV_VALIDATOR_TEST_CUSTOM_THROW: {
            validate: () => {
              throw new Error("Custom validator failed unexpectedly");
            }
          }
        }),
      /Custom validator failed unexpectedly/
    );
});

isolatedTest("detects unexpected variables only in strict mode", () => {
    process.env.ENV_VALIDATOR_TEST_STRING = "present";
    process.env.ENV_VALIDATOR_TEST_EXTRA = "unexpected";
    const schema = { ENV_VALIDATOR_TEST_STRING: { required: true } };

    assert.equal(validateEnv(schema).ENV_VALIDATOR_TEST_STRING, "present");
    assert.throws(
      () => validateEnv(schema, { strict: true }),
      /ENV_VALIDATOR_TEST_EXTRA: Unexpected environment variable\./
    );
});

isolatedTest("rejects malformed schemas and options", () => {
    assert.throws(() => validateEnv(null), TypeError);
    assert.throws(
      () => validateEnv({ KEY: { type: "object" } }),
      /Unsupported type "object"/
    );
    assert.throws(
      () => validateEnv({ KEY: { min: 1 } }),
      /require type "number"/
    );
    assert.throws(
      () => validateEnv({}, { strict: "yes" }),
      /strict option must be a boolean/
    );
});
