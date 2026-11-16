const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  parseString,
  parseNumber,
  parseBoolean,
  parseUrl
} = require("../src/validators");

test("validates strings", () => {
    assert.equal(parseString("value"), "value");
    assert.throws(() => parseString(1), /Expected string/);
});

test("converts finite numeric strings and rejects invalid values", () => {
    assert.equal(parseNumber("3000"), 3000);
    assert.equal(parseNumber(4), 4);
    assert.throws(() => parseNumber(""), /empty value/);
    assert.throws(() => parseNumber("NaN"), /invalid value/);
    assert.throws(() => parseNumber("Infinity"), /invalid value/);
});

test("accepts only true and false for booleans", () => {
    assert.equal(parseBoolean("true"), true);
    assert.equal(parseBoolean("FALSE"), false);
    assert.throws(() => parseBoolean("1"), /neither/);
});

test("validates absolute URLs", () => {
    assert.equal(parseUrl("https://example.com"), "https://example.com");
    assert.throws(() => parseUrl("/relative/path"), /invalid value/);
});
