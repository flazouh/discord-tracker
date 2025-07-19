export class TrackerError extends Error {
  code;
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = 'TrackerError';
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TrackerError);
    }
  }
  static invalidStepNumber(stepNumber) {
    return new TrackerError(`Invalid step number: ${stepNumber}`, 'INVALID_STEP_NUMBER');
  }
  static invalidStatus(status) {
    return new TrackerError(`Invalid status: ${status}`, 'INVALID_STATUS');
  }
  static discordApiError(message, statusCode) {
    const code = statusCode ? `DISCORD_API_${statusCode}` : 'DISCORD_API_ERROR';
    return new TrackerError(`Discord API Error: ${message}`, code);
  }
  static missingRequiredInput(inputName) {
    return new TrackerError(`Missing required input: ${inputName}`, 'MISSING_INPUT');
  }
  static invalidAction(action) {
    return new TrackerError(`Invalid action: ${action}`, 'INVALID_ACTION');
  }
  static fileSystemError(error) {
    return new TrackerError(`File system error: ${error.message}`, 'FILE_SYSTEM_ERROR');
  }
  static jsonError(error) {
    return new TrackerError(`JSON parsing error: ${error.message}`, 'JSON_ERROR');
  }
  static invalidBotToken() {
    return new TrackerError('Bot token is invalid', 'INVALID_BOT_TOKEN');
  }
  static invalidChannelId() {
    return new TrackerError('Channel ID is invalid', 'INVALID_CHANNEL_ID');
  }
}
//# sourceMappingURL=error.js.map
