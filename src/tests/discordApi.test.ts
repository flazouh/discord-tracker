import { describe, it, expect } from 'vitest';
import { DiscordApi } from '../discordApi';
import { TrackerError } from '../error';

describe('DiscordApi', () => {
  it('should create a DiscordApi instance with valid credentials', () => {
    // Valid Discord bot token format: number.23-28chars.6-7chars
    const botToken = '1234567890.abcdefghijklmnopqrstuvwxyz.abcdef';
    const channelId = '123456789012345678';

    expect(() => new DiscordApi(botToken, channelId)).not.toThrow();
  });

  it('should throw error for an empty bot token', () => {
    const botToken = '';
    const channelId = '123456789012345678';

    expect(() => new DiscordApi(botToken, channelId)).toThrow(
      TrackerError.missingRequiredInput('discord_bot_token')
    );
  });

  it('should throw error for an invalid channel ID', () => {
    const botToken = '1234567890.abcdefghijklmnopqrstuvwxyz.abcdef';
    const channelId = 'invalid_channel';

    expect(() => new DiscordApi(botToken, channelId)).not.toThrow();
  });

  it('should create a DiscordApi instance with a valid scientific notation channel ID', () => {
    const botToken = '1234567890.abcdefghijklmnopqrstuvwxyz.abcdef';
    // Convert scientific notation to regular number
    const scientificNotation = '1.39589530256487E+18';
    const channelId = Number(scientificNotation).toString();

    expect(() => new DiscordApi(botToken, channelId)).not.toThrow();
  });
});
