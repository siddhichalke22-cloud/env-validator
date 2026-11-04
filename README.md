# env-validator

A lightweight environment variable validator for Node.js applications.

## Requirements

- Node.js 18 or later

## Installation

```sh
npm install env-validator
```

## Usage

```js
const { validateEnv } = require("env-validator");

const config = validateEnv({
  PORT: { type: "number", required: true },
  DATABASE_URL: { type: "url", required: true },
  JWT_SECRET: { type: "string", required: true }
});

console.log(config.PORT); // 3000 (number)
```

Supported types are `string`, `number`, and `url`. The default type is
`string`. Variables marked `required` must be set and non-empty. Unset optional
variables are omitted from the returned object. Numbers are converted to
JavaScript numbers, URLs are checked with the built-in `URL` parser, and
validation failures throw an error.

## Development

Install the development dependencies and run the test suite:

```sh
npm install
npm test
```

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for
details.
