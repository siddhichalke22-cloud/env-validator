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
  "ENV_VALIDATOR_TEST_EXTRA"
];

const originals = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));

beforeEach(() => {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
});

afterAll(() => {
  for (const [key, value] of originals) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("validateEnv", () => {
  test("validates and converts every supported type", () => {
    process.env.ENV_VALIDATOR_TEST_STRING = "secret";
    process.env.ENV_VALIDATOR_TEST_NUMBER = "3000";
    process.env.ENV_VALIDATOR_TEST_BOOLEAN = "true";
    process.env.ENV_VALIDATOR_TEST_URL = "https://example.com";

    expect(
      validateEnv({
        ENV_VALIDATOR_TEST_STRING: { type: "string", required: true },
        ENV_VALIDATOR_TEST_NUMBER: { type: "number", required: true },
        ENV_VALIDATOR_TEST_BOOLEAN: { type: "boolean", required: true },
        ENV_VALIDATOR_TEST_URL: { type: "url", required: true }
      })
    ).toEqual({
      ENV_VALIDATOR_TEST_STRING: "secret",
      ENV_VALIDATOR_TEST_NUMBER: 3000,
      ENV_VALIDATOR_TEST_BOOLEAN: true,
      ENV_VALIDATOR_TEST_URL: "https://example.com"
    });
  });

  test("collects missing required variables in one readable error", () => {
    try {
      validateEnv({
        ENV_VALIDATOR_TEST_REQUIRED_A: { required: true },
        ENV_VALIDATOR_TEST_REQUIRED_B: { type: "number", required: true }
      });
      throw new Error("Expected validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(EnvironmentValidationError);
      expect(error.errors).toHaveLength(2);
      expect(error.message).toContain(
        "- ENV_VALIDATOR_TEST_REQUIRED_A: Required environment variable is missing."
      );
      expect(error.message).toContain("Please check your .env file.");
    }
  });

  test("rejects invalid numbers, booleans, and URLs", () => {
    const invalidCases = [
      ["number", "not-a-number", "ENV_VALIDATOR_TEST_NUMBER"],
      ["boolean", "yes", "ENV_VALIDATOR_TEST_BOOLEAN"],
      ["url", "not-a-url", "ENV_VALIDATOR_TEST_URL"]
    ];

    for (const [type, value, name] of invalidCases) {
      process.env[name] = value;
      expect(() => validateEnv({ [name]: { type } })).toThrow(
        EnvironmentValidationError
      );
      delete process.env[name];
    }
  });

  test("applies defaults only when the environment value is missing", () => {
    process.env.ENV_VALIDATOR_TEST_DEFAULT = "true";

    expect(
      validateEnv({
        ENV_VALIDATOR_TEST_DEFAULT: { type: "boolean", default: false },
        ENV_VALIDATOR_TEST_BOOLEAN: { type: "number", default: 3000 }
      })
    ).toEqual({
      ENV_VALIDATOR_TEST_DEFAULT: true,
      ENV_VALIDATOR_TEST_BOOLEAN: 3000
    });
    expect(process.env.ENV_VALIDATOR_TEST_DEFAULT).toBe("true");
    expect(process.env.ENV_VALIDATOR_TEST_BOOLEAN).toBeUndefined();
  });

  test("omits an unset optional value", () => {
    expect(
      validateEnv({ ENV_VALIDATOR_TEST_OPTIONAL: { type: "string" } })
    ).toEqual({});
  });

  test("enforces numeric minimum and maximum values", () => {
    process.env.ENV_VALIDATOR_TEST_RANGE = "10";
    expect(
      validateEnv({
        ENV_VALIDATOR_TEST_RANGE: { type: "number", min: 1, max: 10 }
      }).ENV_VALIDATOR_TEST_RANGE
    ).toBe(10);

    process.env.ENV_VALIDATOR_TEST_RANGE = "11";
    expect(() =>
      validateEnv({
        ENV_VALIDATOR_TEST_RANGE: { type: "number", min: 1, max: 10 }
      })
    ).toThrow("less than or equal to 10");
  });

  test("supports allowed values and string length bounds", () => {
    process.env.ENV_VALIDATOR_TEST_ENUM = "production";
    process.env.ENV_VALIDATOR_TEST_LENGTH = "valid-secret";

    expect(
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
      }).ENV_VALIDATOR_TEST_ENUM
    ).toBe("production");

    process.env.ENV_VALIDATOR_TEST_ENUM = "staging";
    expect(() =>
      validateEnv({
        ENV_VALIDATOR_TEST_ENUM: { enum: ["development", "production"] }
      })
    ).toThrow("Expected one of: development, production");
  });

  test("uses custom validation functions and custom messages", () => {
    process.env.ENV_VALIDATOR_TEST_CUSTOM = "not-an-email";
    expect(() =>
      validateEnv({
        ENV_VALIDATOR_TEST_CUSTOM: {
          validate: (value) => value.includes("@") || "Must be an email address"
        }
      })
    ).toThrow("Must be an email address");

    expect(() =>
      validateEnv({
        ENV_VALIDATOR_TEST_CUSTOM_MESSAGE: {
          required: true,
          requiredMessage: "Set this in your local environment."
        }
      })
    ).toThrow("Set this in your local environment.");
  });

  test("detects unexpected variables only in strict mode", () => {
    process.env.ENV_VALIDATOR_TEST_STRING = "present";
    process.env.ENV_VALIDATOR_TEST_EXTRA = "unexpected";
    const schema = { ENV_VALIDATOR_TEST_STRING: { required: true } };

    expect(validateEnv(schema).ENV_VALIDATOR_TEST_STRING).toBe("present");
    expect(() => validateEnv(schema, { strict: true })).toThrow(
      "ENV_VALIDATOR_TEST_EXTRA: Unexpected environment variable."
    );
  });

  test("rejects malformed schemas and options", () => {
    expect(() => validateEnv(null)).toThrow(TypeError);
    expect(() => validateEnv({ KEY: { type: "object" } })).toThrow(
      'Unsupported type "object"'
    );
    expect(() => validateEnv({ KEY: { min: 1 } })).toThrow(
      'require type "number"'
    );
    expect(() => validateEnv({}, { strict: "yes" })).toThrow(
      "strict option must be a boolean"
    );
  });
});
