import { DiscordMessage } from './models';
export declare class DiscordApi {
  private client;
  private botToken;
  private channelId;
  constructor(botToken: string, channelId: string);
  sendMessage(message: DiscordMessage): Promise<string>;
  updateMessage(messageId: string, message: DiscordMessage): Promise<void>;
  deleteMessage(messageId: string): Promise<void>;
}
//# sourceMappingURL=discordApi.d.ts.map
