function parseString(value) {
  if (typeof value !== "string") {
    throw new TypeError("Expected string");
  }

  return value;
}

function parseNumber(value) {
  if (typeof value !== "string" && typeof value !== "number") {
    throw new TypeError("Expected number");
  }

  if (typeof value === "string" && value.trim() === "") {
    throw new TypeError("Expected number but received an empty value");
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new TypeError("Expected number but received an invalid value");
  }

  return parsed;
}

function parseBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    throw new TypeError("Expected boolean");
  }

  switch (value.trim().toLowerCase()) {
    case "true":
      return true;
    case "false":
      return false;
    default:
      throw new TypeError('Expected boolean but received neither "true" nor "false"');
  }
}

function parseUrl(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError("Expected URL but received an invalid value");
  }

  try {
    new URL(value);
  } catch {
    throw new TypeError("Expected URL but received an invalid value");
  }

  return value;
}

const typeValidators = {
  string: parseString,
  number: parseNumber,
  boolean: parseBoolean,
  url: parseUrl
};

module.exports = {
  parseString,
  parseNumber,
  parseBoolean,
  parseUrl,
  typeValidators
};
