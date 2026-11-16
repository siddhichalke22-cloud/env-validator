# env-validator

Validate and convert your Node.js application's environment variables before
the application starts. `env-validator` has no runtime dependencies and uses
Node.js's built-in `URL` API.

## Features

- Required and optional variables
- `string`, `number`, `boolean`, and `url` types
- Type conversion for numeric and boolean values
- Typed default values that never overwrite `process.env`
- Number and string length bounds, enums, and custom validation
- Aggregated, developer-friendly errors with per-variable messages
- Optional strict mode for detecting undeclared environment variables
- CommonJS and ES module imports

## Requirements

Node.js 18 or later.

## Installation

```sh
npm install env-validator
```

If you want to load a `.env` file, install and configure [dotenv](https://www.npmjs.com/package/dotenv) separately:

```sh
npm install dotenv
```

`env-validator` reads from `process.env`; it does not load files or modify
`process.env` itself.

## Quick start

CommonJS:

```js
require("dotenv").config();

const { validateEnv } = require("env-validator");

const env = validateEnv({
  PORT: { type: "number", required: true },
  DATABASE_URL: { type: "url", required: true },
  JWT_SECRET: { type: "string", required: true },
  DEBUG: { type: "boolean", default: false }
});

console.log(`Listening on ${env.PORT}; debug=${env.DEBUG}`);
```

ES modules:

```js
import "dotenv/config";
import { validateEnv } from "env-validator";

const env = validateEnv({
  PORT: { type: "number", required: true },
  DEBUG: { type: "boolean", default: false }
});
```

The returned object contains only declared variables that were set or given a
default. Converted values are available there (`env.PORT` is a number), while
the original string values in `process.env` remain unchanged.

## Supported types

| Type | Behavior |
| --- | --- |
| `string` | Keeps the environment value as a string. This is the default type. |
| `number` | Converts with `Number()` and rejects empty, non-finite, or invalid values. |
| `boolean` | Accepts `true` or `false`, case-insensitively; rejects all other values. |
| `url` | Validates an absolute URL with the built-in `URL` API and returns its original string. |

## Defaults and optional values

Variables are optional unless `required: true` is specified. Missing optional
values are omitted from the result unless they have a `default`. Defaults pass
through the same type and constraint validation as environment values.

```js
const env = validateEnv({
  PORT: { type: "number", default: 3000 },
  DEBUG: { type: "boolean", default: false },
  OPTIONAL_LABEL: { type: "string" }
});
```

An existing environment value always takes precedence over its default.
Defaults are only applied in the returned object; they do not set or replace
`process.env` values.

## Advanced validation

```js
const env = validateEnv(
  {
    NODE_ENV: {
      type: "string",
      default: "development",
      enum: ["development", "test", "production"]
    },
    PORT: { type: "number", min: 1, max: 65535 },
    API_KEY: {
      type: "string",
      required: true,
      minLength: 24,
      maxLength: 128,
      requiredMessage: "Set API_KEY in your .env file.",
      message: "API_KEY must contain between 24 and 128 characters."
    },
    SUPPORT_EMAIL: {
      type: "string",
      validate: (value) => value.includes("@") || "Must be an email address."
    }
  },
  { strict: true }
);
```

Custom `validate` functions receive the converted value. Return `true` for a
valid value, `false` for a generic failure, or a string to use as the error
message. Exceptions thrown by a custom validator are not swallowed.

Strict mode is off by default. When enabled with `{ strict: true }`, every key
in `process.env` must appear in the schema. This includes variables set by the
operating system, shell, or other tools, so strict mode is most useful when the
application controls its complete environment.

## Error handling

All variable validation failures are collected and thrown together as an
`EnvironmentValidationError`:

```text
❌ Environment Validation Failed!

- PORT: Expected number but received an invalid value
- DATABASE_URL: Required environment variable is missing.
Please check your .env file.
```

The error has an `errors` array containing `{ name, message }` entries and a
`variable` property containing the first failing variable name. Schema
configuration errors (for example, an unsupported type or malformed bounds)
throw `TypeError` immediately.

```js
const {
  validateEnv,
  EnvironmentValidationError
} = require("env-validator");

try {
  validateEnv({ PORT: { type: "number", required: true } });
} catch (error) {
  if (error instanceof EnvironmentValidationError) {
    console.error(error.message);
    process.exitCode = 1;
  } else {
    throw error;
  }
}
```

## Configuration reference

Call `validateEnv(schema, options?)`. `schema` maps environment variable names
to rule objects.

| Rule | Type | Description |
| --- | --- | --- |
| `type` | `"string" \| "number" \| "boolean" \| "url"` | Expected type; defaults to `"string"`. |
| `required` | `boolean` | If true, an unset or empty variable is an error. Defaults to `false`. |
| `default` | Any | Value to validate and return when the variable is unset. |
| `message` | `string` | Custom message for validation failures on this variable. |
| `requiredMessage` | `string` | Custom message for missing or empty required values. |
| `min` / `max` | finite `number` | Inclusive bounds; only valid for `type: "number"`. |
| `minLength` / `maxLength` | non-negative integer | Inclusive string length bounds; only valid for `type: "string"`. |
| `enum` | non-empty array | Allowed values; compared against the converted value. |
| `validate` | `(value) => true \| false \| string` | Additional synchronous validation. |

The optional `options` object supports:

| Option | Type | Description |
| --- | --- | --- |
| `strict` | `boolean` | Report environment keys that are not declared in the schema. Defaults to `false`. |

Unknown rule and option keys are rejected to help catch configuration typos.

## Examples

Runnable CommonJS examples are in [`examples/basic.js`](./examples/basic.js)
and [`examples/advanced.js`](./examples/advanced.js). Both load `.env` through
`dotenv`, which must be installed separately in the consuming application.

## Development and local testing

```sh
npm install
npm test
npm pack --dry-run
```

To try the package through a local npm installation:

```sh
npm pack
mkdir /tmp/env-validator-check
cd /tmp/env-validator-check
npm install /path/to/env-validator/env-validator-1.0.0.tgz
node -e 'console.log(require("env-validator").validateEnv({ NODE_ENV: { default: "development" } }))'
```

To verify ES module imports, use a `.mjs` file or run Node with
`--input-type=module` and `import { validateEnv } from "env-validator"`.

## Contributing

Contributions are welcome. Please keep changes focused, add or update tests for
behavior changes, and run `npm test` before opening a pull request.

## Publishing

Publishing is intentionally a manual maintainer action:

1. Review the package contents with `npm pack --dry-run`.
2. Run the tests with `npm test`.
3. Sign in to npm with `npm login`.
4. Publish the release with `npm publish`.

Do not publish until the package name, version, contents, and npm account have
been reviewed and the maintainer explicitly approves the release.

## License

MIT. See [LICENSE](./LICENSE).
