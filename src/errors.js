class EnvironmentValidationError extends Error {
  constructor(message, variable) {
    super(message);
    this.name = "EnvironmentValidationError";
    this.variable = variable;
  }
}

module.exports = { EnvironmentValidationError };