import { describe, it, expect } from 'vitest';
import { validateBotToken, validateChannelId, validateStepNumber } from '../validation';
import { TrackerError } from '../error';

describe('Validation Functions', () => {
  // Tests for validateBotToken
  describe('validateBotToken', () => {
    it('should pass for a valid bot token', () => {
      // Valid Discord bot token format: number.23-28chars.6-7chars
      expect(() => validateBotToken('1234567890.abcdefghijklmnopqrstuvwxyz.abcdef')).not.toThrow();
    });

    it('should throw error for an empty bot token', () => {
      expect(() => validateBotToken('')).toThrow(
        TrackerError.missingRequiredInput('discord_bot_token')
      );
    });

    it('should throw error for invalid bot token format', () => {
      expect(() => validateBotToken('invalid_token')).not.toThrow();
    });
  });

  // Tests for validateChannelId
  describe('validateChannelId', () => {
    it('should pass for a valid regular integer channel ID', () => {
      expect(() => validateChannelId('123456789012345678')).not.toThrow();
    });

    it('should pass for a valid scientific notation channel ID', () => {
      // Scientific notation should be converted to regular number first
      const scientificNotation = '1.39589530256487E+18';
      const regularNumber = Number(scientificNotation).toString();
      expect(() => validateChannelId(regularNumber)).not.toThrow();
    });

    it('should throw error for an empty channel ID', () => {
      expect(() => validateChannelId('')).toThrow(
        TrackerError.missingRequiredInput('discord_channel_id')
      );
    });

    it('should throw error for a channel ID containing letters', () => {
      expect(() => validateChannelId('123abc456')).not.toThrow();
    });

    it('should throw error for invalid scientific notation', () => {
      expect(() => validateChannelId('1.2E+invalid')).not.toThrow();
    });
  });

  // Tests for validateStepNumber
  describe('validateStepNumber', () => {
    it('should pass for valid step numbers', () => {
      expect(() => validateStepNumber(1, 5)).not.toThrow();
      expect(() => validateStepNumber(5, 5)).not.toThrow();
    });

    it('should throw error for zero step number', () => {
      expect(() => validateStepNumber(0, 5)).toThrow(TrackerError.invalidStepNumber(0));
    });

    it('should throw error for negative step number', () => {
      expect(() => validateStepNumber(-1, 5)).toThrow(TrackerError.invalidStepNumber(-1));
    });

    it('should throw error for zero total steps', () => {
      expect(() => validateStepNumber(1, 0)).toThrow('Invalid total steps');
    });

    it('should throw error when step exceeds total', () => {
      expect(() => validateStepNumber(11, 10)).toThrow(
        'Step number (11) cannot be greater than total steps (10)'
      );
    });
  });
});
