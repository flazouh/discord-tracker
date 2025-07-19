import type { DiscordMessage } from './models';
interface RetryConfig {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
}
export declare class DiscordApi {
    private client;
    private botToken;
    private channelId;
    private retryConfig;
    constructor(botToken: string, channelId: string, retryConfig?: Partial<RetryConfig>);
    private isRetryableError;
    private calculateDelay;
    private sleep;
    private executeWithRetry;
    sendMessage(message: DiscordMessage): Promise<string>;
    updateMessage(messageId: string, message: DiscordMessage): Promise<void>;
    deleteMessage(messageId: string): Promise<void>;
    checkApiHealth(): Promise<{
        available: boolean;
        error?: string;
    }>;
}
export {};
//# sourceMappingURL=discordApi.d.ts.map