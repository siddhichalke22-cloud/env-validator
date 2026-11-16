const {
  parseString,
  parseNumber,
  parseBoolean,
  parseUrl
} = require("../src/validators");

describe("type validators", () => {
  test("validates strings", () => {
    expect(parseString("value")).toBe("value");
    expect(() => parseString(1)).toThrow("Expected string");
  });

  test("converts finite numeric strings and rejects invalid values", () => {
    expect(parseNumber("3000")).toBe(3000);
    expect(parseNumber(4)).toBe(4);
    expect(() => parseNumber("")).toThrow("empty value");
    expect(() => parseNumber("NaN")).toThrow("invalid value");
    expect(() => parseNumber("Infinity")).toThrow("invalid value");
  });

  test("accepts only true and false for booleans", () => {
    expect(parseBoolean("true")).toBe(true);
    expect(parseBoolean("FALSE")).toBe(false);
    expect(() => parseBoolean("1")).toThrow("neither");
  });

  test("validates absolute URLs", () => {
    expect(parseUrl("https://example.com")).toBe("https://example.com");
    expect(() => parseUrl("/relative/path")).toThrow("invalid value");
  });
});
