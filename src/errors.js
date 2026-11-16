class EnvironmentValidationError extends Error {
  constructor(errors) {
    const details = errors.map(({ name, message }) => `- ${name}: ${message}`);
    super(
      `❌ Environment Validation Failed!\n\n${details.join("\n")}\nPlease check your .env file.`
    );

    this.name = "EnvironmentValidationError";
    this.errors = errors;
    this.variable = errors[0]?.name;
  }
}

module.exports = { EnvironmentValidationError };