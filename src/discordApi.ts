import axios from "axios";
import { TrackerError } from "./error";
import { validateBotToken, validateChannelId } from "./validation";
import { DiscordMessage } from "./models";

interface DiscordMessageResponse {
	id: string;
}

interface DiscordErrorResponse {
	code?: number;
	message: string;
}

/// Discord API client for sending messages
export class DiscordApi {
	private client: any;
	private botToken: string;
	private channelId: string;

	constructor(botToken: string, channelId: string) {
		validateBotToken(botToken);
		validateChannelId(channelId);

		this.botToken = botToken;
		this.channelId = channelId;

		this.client = axios.create({
			baseURL: "https://discord.com/api/v10",
			timeout: 30000, // 30 seconds
			headers: {
				Authorization: `Bot ${this.botToken}`,
				"Content-Type": "application/json",
			},
		});
	}

	/// Sends a message to Discord
	async sendMessage(message: DiscordMessage): Promise<string> {
		try {
			const response = await this.client.post(
				`/channels/${this.channelId}/messages`,
				message,
			);
			return response.data.id;
		} catch (error: any) {
			if (error.response) {
				const errorResponse: DiscordErrorResponse = error.response.data;
				throw TrackerError.discordApiError(
					errorResponse.message || "Unknown error",
					error.response.status,
				);
			} else if (error.request) {
				throw TrackerError.discordApiError("No response received");
			} else {
				throw TrackerError.discordApiError(
					`Request setup failed: ${error.message}`,
				);
			}
		}
	}

	/// Updates an existing message
	async updateMessage(
		messageId: string,
		message: DiscordMessage,
	): Promise<void> {
		try {
			await this.client.patch(
				`/channels/${this.channelId}/messages/${messageId}`,
				message,
			);
		} catch (error: any) {
			if (error.response) {
				const errorResponse: DiscordErrorResponse = error.response.data;
				throw TrackerError.discordApiError(
					errorResponse.message || "Unknown error",
					error.response.status,
				);
			} else if (error.request) {
				throw TrackerError.discordApiError("No response received");
			} else {
				throw TrackerError.discordApiError(
					`Request setup failed: ${error.message}`,
				);
			}
		}
	}

	/// Deletes a message
	async deleteMessage(messageId: string): Promise<void> {
		try {
			await this.client.delete(
				`/channels/${this.channelId}/messages/${messageId}`,
			);
		} catch (error: any) {
			if (error.response) {
				const errorResponse: DiscordErrorResponse = error.response.data;
				throw TrackerError.discordApiError(
					errorResponse.message || "Unknown error",
					error.response.status,
				);
			} else if (error.request) {
				throw TrackerError.discordApiError("No response received");
			} else {
				throw TrackerError.discordApiError(
					`Request setup failed: ${error.message}`,
				);
			}
		}
	}
}
