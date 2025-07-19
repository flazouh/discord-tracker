import axios, { type AxiosError, type AxiosInstance } from 'axios';
import { TrackerError } from './error';
import type { DiscordMessage } from './models';
import { validateBotToken, validateChannelId } from './validation';

interface DiscordErrorResponse {
  code?: number;
  message: string;
  retry_after?: number;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
};

/// Discord API client for sending messages
export class DiscordApi {
  private client: AxiosInstance;
  private botToken: string;
  private channelId: string;
  private retryConfig: RetryConfig;

  constructor(botToken: string, channelId: string, retryConfig: Partial<RetryConfig> = {}) {
    validateBotToken(botToken);
    validateChannelId(channelId);

    this.botToken = botToken;
    this.channelId = channelId;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };

    this.client = axios.create({
      baseURL: 'https://discord.com/api/v10',
      timeout: 30000, // 30 seconds
      headers: {
        Authorization: `Bot ${this.botToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /// Determines if an error is retryable
  private isRetryableError(error: AxiosError): boolean {
    if (!error.response) {
      // Network errors are retryable
      return true;
    }

    const status = error.response.status;
    
    // Rate limiting (429) is retryable
    if (status === 429) {
      return true;
    }
    
    // Server errors (5xx) are retryable
    if (status >= 500) {
      return true;
    }
    
    // Client errors (4xx except 429) are generally not retryable
    return false;
  }

  /// Calculates delay for exponential backoff
  private calculateDelay(attempt: number, retryAfter?: number): number {
    if (retryAfter) {
      // Discord provided retry_after, use it (convert from seconds to milliseconds)
      return Math.min(retryAfter * 1000, this.retryConfig.maxDelay);
    }
    
    // Exponential backoff: baseDelay * 2^attempt with jitter
    const exponentialDelay = this.retryConfig.baseDelay * (2 ** attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay; // Add up to 10% jitter
    const totalDelay = exponentialDelay + jitter;
    
    return Math.min(totalDelay, this.retryConfig.maxDelay);
  }

  /// Sleeps for the specified number of milliseconds
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /// Executes a function with retry logic
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: AxiosError | null = null;
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as AxiosError;
        
        // If this is the last attempt or error is not retryable, break to throw
        if (attempt === this.retryConfig.maxRetries || !this.isRetryableError(lastError)) {
          break;
        }
        
        // Calculate delay for next attempt
        const retryAfter = (lastError.response?.data as DiscordErrorResponse)?.retry_after;
        const delay = this.calculateDelay(attempt, retryAfter);
        
        console.warn(
          `Discord API ${operationName} failed (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1}), ` +
          `retrying in ${delay}ms. Error: ${lastError.message}` +
          (lastError.response?.status ? ` (HTTP ${lastError.response.status})` : '')
        );
        
        await this.sleep(delay);
      }
    }
    
    // All retries exhausted, throw enhanced error with actionable information
    if (!lastError) {
      throw TrackerError.discordApiError('Unknown error occurred during Discord API operation');
    }
    
    if (lastError.response) {
      const errorResponse = lastError.response.data as DiscordErrorResponse;
      const status = lastError.response.status;
      let actionableMessage = `Discord API ${operationName} failed after ${this.retryConfig.maxRetries + 1} attempts. `;
      
      // Provide actionable error messages based on status code
      switch (status) {
        case 401:
          actionableMessage += 'Authentication failed. Please verify your bot token is correct and has not expired.';
          break;
        case 403:
          actionableMessage += 'Permission denied. Please ensure the bot has permission to send/edit messages in the target channel.';
          break;
        case 404:
          actionableMessage += 'Channel or message not found. Please verify the channel ID is correct and the bot has access to it.';
          break;
        case 429:
          actionableMessage += 'Rate limit exceeded. The bot is being rate limited by Discord. Consider reducing message frequency.';
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          actionableMessage += 'Discord server error. This is a temporary issue with Discord\'s servers. The operation will be retried automatically.';
          break;
        default:
          actionableMessage += `HTTP ${status}: ${errorResponse.message || 'Unknown error'}`;
      }
      
      throw TrackerError.discordApiError(actionableMessage, status);
    } else if (lastError.request) {
      throw TrackerError.discordApiError(
        `Discord API ${operationName} failed: No response received after ${this.retryConfig.maxRetries + 1} attempts. ` +
        'This may indicate network connectivity issues or Discord API unavailability. ' +
        'Please check your internet connection and Discord API status.'
      );
    } else {
      throw TrackerError.discordApiError(
        `Discord API ${operationName} failed: Request setup error - ${lastError.message}. ` +
        'This may indicate a configuration issue with the bot token or channel ID.'
      );
    }
  }

  /// Sends a message to Discord
  async sendMessage(message: DiscordMessage): Promise<string> {
    return this.executeWithRetry(async () => {
      const response = await this.client.post(`/channels/${this.channelId}/messages`, message);
      return response.data.id;
    }, 'sendMessage');
  }

  /// Updates an existing message
  async updateMessage(messageId: string, message: DiscordMessage): Promise<void> {
    return this.executeWithRetry(async () => {
      await this.client.patch(`/channels/${this.channelId}/messages/${messageId}`, message);
    }, 'updateMessage');
  }

  /// Deletes a message
  async deleteMessage(messageId: string): Promise<void> {
    return this.executeWithRetry(async () => {
      await this.client.delete(`/channels/${this.channelId}/messages/${messageId}`);
    }, 'deleteMessage');
  }

  /// Checks if Discord API is available by attempting to get channel info
  async checkApiHealth(): Promise<{ available: boolean; error?: string }> {
    try {
      await this.client.get(`/channels/${this.channelId}`);
      return { available: true };
    } catch (error) {
      const axiosError = error as AxiosError;
      let errorMessage = 'Unknown error';
      
      if (axiosError.response) {
        const status = axiosError.response.status;
        switch (status) {
          case 401:
            errorMessage = 'Invalid bot token';
            break;
          case 403:
            errorMessage = 'Bot lacks permission to access channel';
            break;
          case 404:
            errorMessage = 'Channel not found or bot not in server';
            break;
          default:
            errorMessage = `HTTP ${status}: ${axiosError.message}`;
        }
      } else if (axiosError.request) {
        errorMessage = 'Network connectivity issue - cannot reach Discord API';
      } else {
        errorMessage = `Request setup error: ${axiosError.message}`;
      }
      
      return { available: false, error: errorMessage };
    }
  }
}
