import { TrackerError } from "./error";

/**
 * Validates a Discord bot token
 * @param token - The bot token to validate
 * @throws TrackerError if the token is invalid
 */
export function validateBotToken(token: string): void {
	if (!token || typeof token !== "string") {
		throw TrackerError.missingRequiredInput("discord_bot_token");
	}

	if (token.trim().length === 0) {
		throw TrackerError.missingRequiredInput("discord_bot_token");
	}

}

/**
 * Validates a Discord channel ID
 * @param channelId - The channel ID to validate
 * @throws TrackerError if the channel ID is invalid
 */
export function validateChannelId(channelId: string): void {
	if (!channelId || typeof channelId !== "string") {
		throw TrackerError.missingRequiredInput("discord_channel_id");
	}

	if (channelId.trim().length === 0) {
		throw TrackerError.missingRequiredInput("discord_channel_id");
	}

}

/**
 * Validates a pull request number
 * @param prNumber - The PR number to validate
 * @throws TrackerError if the PR number is invalid
 */
export function validatePrNumber(prNumber: string): void {
	if (!prNumber || typeof prNumber !== "string") {
		throw TrackerError.missingRequiredInput("pr_number");
	}

	const num = parseInt(prNumber, 10);
	if (Number.isNaN(num) || num <= 0) {
		throw new TrackerError("Invalid pull request number", "INVALID_PR_NUMBER");
	}
}

/**
 * Validates a step number
 * @param stepNumber - The step number to validate
 * @param totalSteps - The total number of steps
 * @throws TrackerError if the step number is invalid
 */
export function validateStepNumber(
	stepNumber: number,
	totalSteps: number,
): void {
	if (stepNumber <= 0) {
		throw TrackerError.invalidStepNumber(stepNumber);
	}

	if (totalSteps <= 0) {
		throw new TrackerError("Invalid total steps", "INVALID_TOTAL_STEPS");
	}

	if (stepNumber > totalSteps) {
		throw new TrackerError(
			`Step number (${stepNumber}) cannot be greater than total steps (${totalSteps})`,
			"STEP_NUMBER_EXCEEDS_TOTAL",
		);
	}
}

/**
 * Validates a repository name
 * @param repository - The repository name to validate
 * @throws TrackerError if the repository name is invalid
 */
export function validateRepository(repository: string): void {
	if (!repository || typeof repository !== "string") {
		throw TrackerError.missingRequiredInput("repository");
	}

	if (repository.trim().length === 0) {
		throw TrackerError.missingRequiredInput("repository");
	}

	// GitHub repository format: owner/repo
	const repoPattern = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;
	if (!repoPattern.test(repository)) {
		throw new TrackerError(
			"Invalid repository format. Expected: owner/repo",
			"INVALID_REPOSITORY",
		);
	}
}

/**
 * Validates an action name
 * @param action - The action to validate
 * @throws TrackerError if the action is invalid
 */
export function validateAction(action: string): void {
	const validActions = ["init", "step", "complete", "fail"];

	if (!action || typeof action !== "string") {
		throw TrackerError.missingRequiredInput("action");
	}

	if (!validActions.includes(action)) {
		throw TrackerError.invalidAction(action);
	}
}

/**
 * Validates additional info JSON string
 * @param additionalInfo - The additional info JSON string to validate
 * @returns Parsed additional info or empty array if invalid
 */
export function validateAdditionalInfo(
	additionalInfo: string,
): Array<[string, string]> {
	if (!additionalInfo || additionalInfo.trim().length === 0) {
		return [];
	}

	try {
		const parsed = JSON.parse(additionalInfo);
		if (
			typeof parsed === "object" &&
			parsed !== null &&
			!Array.isArray(parsed)
		) {
			return Object.entries(parsed).map(([key, value]) => [key, String(value)]);
		}
		return [];
	} catch (_error) {
		// Return empty array for invalid JSON instead of throwing
		return [];
	}
}
