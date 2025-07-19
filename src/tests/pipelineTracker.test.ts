import { describe, it, expect } from "vitest";
import { PipelineTracker } from "../pipelineTracker";
import { TrackerError } from "../error";

describe("PipelineTracker Integration Tests", () => {
	// Valid Discord bot token format: number.23-28chars.6-7chars
	const VALID_BOT_TOKEN = "1234567890.abcdefghijklmnopqrstuvwxyz.abcdef";
	// Convert scientific notation to regular number
	const VALID_CHANNEL_ID = Number("1.39589530256487E+18").toString();
	const INVALID_BOT_TOKEN = "";
	const INVALID_CHANNEL_ID = "invalid_channel";

	it("should successfully create PipelineTracker instance with valid credentials", () => {
		expect(
			() => new PipelineTracker(VALID_BOT_TOKEN, VALID_CHANNEL_ID),
		).not.toThrow();
	});

	it("should throw error when bot token is empty", () => {
		expect(
			() => new PipelineTracker(INVALID_BOT_TOKEN, VALID_CHANNEL_ID),
		).toThrow(TrackerError.missingRequiredInput("discord_bot_token"));
	});

	it("should throw error when channel ID is invalid", () => {
		expect(
			() => new PipelineTracker(VALID_BOT_TOKEN, INVALID_CHANNEL_ID),
		).toThrow("Invalid Discord channel ID format");
	});
});
