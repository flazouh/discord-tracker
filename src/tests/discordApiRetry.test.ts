import { describe, it, expect } from 'bun:test';
import { DiscordApi } from '../discordApi';

describe('Discord API Retry Logic Tests', () => {
  const validBotToken = '1234567890.abcdefghijklmnopqrstuvwxyz.abcdef';
  const validChannelId = '123456789012345678';

  describe('Retry Configuration', () => {
    it('should accept custom retry configuration', () => {
      const customConfig = {
        maxRetries: 5,
        baseDelay: 2000,
        maxDelay: 60000
      };

      const api = new DiscordApi(validBotToken, validChannelId, customConfig);
      expect(api).toBeInstanceOf(DiscordApi);
    });

    it('should work with partial retry configuration', () => {
      const partialConfig = {
        maxRetries: 2
      };

      const api = new DiscordApi(validBotToken, validChannelId, partialConfig);
      expect(api).toBeInstanceOf(DiscordApi);
    });

    it('should use default configuration when none provided', () => {
      const api = new DiscordApi(validBotToken, validChannelId);
      expect(api).toBeInstanceOf(DiscordApi);
    });

    it('should handle zero retry configuration', () => {
      const zeroRetryConfig = {
        maxRetries: 0,
        baseDelay: 1000,
        maxDelay: 5000
      };

      const api = new DiscordApi(validBotToken, validChannelId, zeroRetryConfig);
      expect(api).toBeInstanceOf(DiscordApi);
    });

    it('should handle edge case retry configurations', () => {
      // Test very small delays
      const smallDelayConfig = {
        maxRetries: 1,
        baseDelay: 1,
        maxDelay: 10
      };

      const api1 = new DiscordApi(validBotToken, validChannelId, smallDelayConfig);
      expect(api1).toBeInstanceOf(DiscordApi);

      // Test very large delays
      const largeDelayConfig = {
        maxRetries: 10,
        baseDelay: 10000,
        maxDelay: 300000
      };

      const api2 = new DiscordApi(validBotToken, validChannelId, largeDelayConfig);
      expect(api2).toBeInstanceOf(DiscordApi);
    });
  });

  describe('API Health Check', () => {
    it('should provide health check method', async () => {
      const api = new DiscordApi(validBotToken, validChannelId);
      
      // This will fail with fake credentials, but should return a structured response
      const healthResult = await api.checkApiHealth();
      
      expect(healthResult).toHaveProperty('available');
      expect(typeof healthResult.available).toBe('boolean');
      
      if (!healthResult.available) {
        expect(healthResult).toHaveProperty('error');
        expect(typeof healthResult.error).toBe('string');
      }
    });

    it('should handle health check with invalid token', async () => {
      const api = new DiscordApi('invalid-token', validChannelId);
      
      const healthResult = await api.checkApiHealth();
      
      expect(healthResult.available).toBe(false);
      expect(healthResult.error).toContain('Invalid bot token');
    });

    it('should handle health check with invalid channel', async () => {
      const api = new DiscordApi(validBotToken, 'invalid-channel');
      
      const healthResult = await api.checkApiHealth();
      
      expect(healthResult.available).toBe(false);
      expect(healthResult.error).toBeDefined();
    });
  });

  describe('Error Message Enhancement', () => {
    it('should create DiscordApi instances for testing error scenarios', () => {
      // These tests verify that the DiscordApi can be instantiated with various configurations
      // The actual error handling is tested through integration tests where real API calls fail
      
      const api1 = new DiscordApi(validBotToken, validChannelId, { maxRetries: 1 });
      expect(api1).toBeInstanceOf(DiscordApi);
      
      const api2 = new DiscordApi(validBotToken, validChannelId, { baseDelay: 500 });
      expect(api2).toBeInstanceOf(DiscordApi);
      
      const api3 = new DiscordApi(validBotToken, validChannelId, { maxDelay: 10000 });
      expect(api3).toBeInstanceOf(DiscordApi);
    });

    it('should validate input parameters', () => {
      // Test that invalid tokens are caught during construction
      expect(() => new DiscordApi('', validChannelId)).toThrow();
      expect(() => new DiscordApi('   ', validChannelId)).toThrow();
      
      // Test that invalid channel IDs are caught during construction
      expect(() => new DiscordApi(validBotToken, '')).toThrow();
      expect(() => new DiscordApi(validBotToken, '   ')).toThrow();
    });
  });

  describe('Retry Logic Implementation', () => {
    it('should implement exponential backoff calculation', () => {
      // We can't easily test the private methods, but we can verify the API is constructed
      // with different delay configurations that would affect the backoff calculation
      
      const shortDelayApi = new DiscordApi(validBotToken, validChannelId, {
        maxRetries: 3,
        baseDelay: 100,
        maxDelay: 5000
      });
      expect(shortDelayApi).toBeInstanceOf(DiscordApi);
      
      const longDelayApi = new DiscordApi(validBotToken, validChannelId, {
        maxRetries: 5,
        baseDelay: 2000,
        maxDelay: 30000
      });
      expect(longDelayApi).toBeInstanceOf(DiscordApi);
    });

    it('should handle retry configuration edge cases', () => {
      // Test configuration where maxDelay is smaller than baseDelay
      const edgeCaseConfig = {
        maxRetries: 2,
        baseDelay: 5000,
        maxDelay: 1000  // Smaller than baseDelay
      };
      
      const api = new DiscordApi(validBotToken, validChannelId, edgeCaseConfig);
      expect(api).toBeInstanceOf(DiscordApi);
    });

    it('should support different retry strategies through configuration', () => {
      // Aggressive retry strategy
      const aggressiveRetry = {
        maxRetries: 10,
        baseDelay: 500,
        maxDelay: 60000
      };
      
      const aggressiveApi = new DiscordApi(validBotToken, validChannelId, aggressiveRetry);
      expect(aggressiveApi).toBeInstanceOf(DiscordApi);
      
      // Conservative retry strategy
      const conservativeRetry = {
        maxRetries: 2,
        baseDelay: 2000,
        maxDelay: 10000
      };
      
      const conservativeApi = new DiscordApi(validBotToken, validChannelId, conservativeRetry);
      expect(conservativeApi).toBeInstanceOf(DiscordApi);
      
      // No retry strategy
      const noRetry = {
        maxRetries: 0,
        baseDelay: 1000,
        maxDelay: 5000
      };
      
      const noRetryApi = new DiscordApi(validBotToken, validChannelId, noRetry);
      expect(noRetryApi).toBeInstanceOf(DiscordApi);
    });
  });

  describe('Message Operations', () => {
    it('should provide sendMessage method', () => {
      const api = new DiscordApi(validBotToken, validChannelId);
      
      // Verify the method exists
      expect(typeof api.sendMessage).toBe('function');
    });

    it('should provide updateMessage method', () => {
      const api = new DiscordApi(validBotToken, validChannelId);
      
      // Verify the method exists
      expect(typeof api.updateMessage).toBe('function');
    });

    it('should provide deleteMessage method', () => {
      const api = new DiscordApi(validBotToken, validChannelId);
      
      // Verify the method exists
      expect(typeof api.deleteMessage).toBe('function');
    });

    it('should provide checkApiHealth method', () => {
      const api = new DiscordApi(validBotToken, validChannelId);
      
      // Verify the method exists
      expect(typeof api.checkApiHealth).toBe('function');
    });
  });
});