/**
 * Validates a Discord bot token
 * @param token - The bot token to validate
 * @throws TrackerError if the token is invalid
 */
export declare function validateBotToken(token: string): void;
/**
 * Validates a Discord channel ID
 * @param channelId - The channel ID to validate
 * @throws TrackerError if the channel ID is invalid
 */
export declare function validateChannelId(channelId: string): void;
/**
 * Validates a pull request number
 * @param prNumber - The PR number to validate
 * @throws TrackerError if the PR number is invalid
 */
export declare function validatePrNumber(prNumber: string): void;
/**
 * Validates a step number
 * @param stepNumber - The step number to validate
 * @param totalSteps - The total number of steps
 * @throws TrackerError if the step number is invalid
 */
export declare function validateStepNumber(stepNumber: number, totalSteps: number): void;
/**
 * Validates a repository name
 * @param repository - The repository name to validate
 * @throws TrackerError if the repository name is invalid
 */
export declare function validateRepository(repository: string): void;
/**
 * Validates an action name
 * @param action - The action to validate
 * @throws TrackerError if the action is invalid
 */
export declare function validateAction(action: string): void;
/**
 * Validates additional info JSON string
 * @param additionalInfo - The additional info JSON string to validate
 * @returns Parsed additional info or empty array if invalid
 */
export declare function validateAdditionalInfo(additionalInfo: string): Array<[string, string]>;
//# sourceMappingURL=validation.d.ts.map