import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { PipelineTracker, InMemoryStorage, type Storage, type InternalPipelineState } from '../pipelineTracker';
import { DiscordApi } from '../discordApi';
import { FileStorage } from '../storage';

// Mock storage that can simulate various failure scenarios
class MockStorage implements Storage {
  private state: InternalPipelineState | null = null;
  private shouldFailLoad = false;
  private shouldFailSave = false;
  private shouldFailValidation = false;
  private loadCallCount = 0;
  private saveCallCount = 0;

  setShouldFailLoad(fail: boolean) {
    this.shouldFailLoad = fail;
  }

  setShouldFailSave(fail: boolean) {
    this.shouldFailSave = fail;
  }

  setShouldFailValidation(fail: boolean) {
    this.shouldFailValidation = fail;
  }

  getLoadCallCount(): number {
    return this.loadCallCount;
  }

  getSaveCallCount(): number {
    return this.saveCallCount;
  }

  resetCallCounts() {
    this.loadCallCount = 0;
    this.saveCallCount = 0;
  }

  async loadPipelineState(): Promise<InternalPipelineState | null> {
    this.loadCallCount++;
    if (this.shouldFailLoad) {
      throw new Error('Simulated storage load failure');
    }
    return this.state;
  }

  async savePipelineState(state: InternalPipelineState): Promise<void> {
    this.saveCallCount++;
    if (this.shouldFailSave) {
      throw new Error('Simulated storage save failure');
    }
    this.state = state;
  }

  async clearPipelineState(): Promise<void> {
    this.state = null;
  }

  validateState(state: InternalPipelineState): boolean {
    if (this.shouldFailValidation) {
      return false;
    }
    // Basic validation
    return !!(state && state.messageId !== undefined && state.prNumber >= 0);
  }
}

describe('Fixes Validation Tests', () => {
  let originalConsoleError: typeof console.error;
  let originalConsoleWarn: typeof console.warn;
  let originalConsoleLog: typeof console.log;
  let errorLogs: string[];
  let warnLogs: string[];
  let infoLogs: string[];

  beforeEach(() => {
    errorLogs = [];
    warnLogs = [];
    infoLogs = [];

    // Mock console methods to capture logs
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;
    originalConsoleLog = console.log;

    console.error = (...args: unknown[]) => {
      errorLogs.push(args.join(' '));
    };
    console.warn = (...args: unknown[]) => {
      warnLogs.push(args.join(' '));
    };
    console.log = (...args: unknown[]) => {
      infoLogs.push(args.join(' '));
    };
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.log = originalConsoleLog;
  });

  describe('State Loading in updateStep Method', () => {
    it('should call loadState at the beginning of updateStep', async () => {
      const mockStorage = new MockStorage();
      const tracker = new PipelineTracker('1234567890.abcdefghijklmnopqrstuvwxyz.abcdef', '123456789', mockStorage);

      // Call updateStep directly (without initialization to avoid Discord API calls)
      // This will test that loadState is called even when no prior state exists
      await tracker.updateStep(1, 3, 'Test Step', 'running', []);

      // Verify loadState was called (indicated by load call count)
      expect(mockStorage.getLoadCallCount()).toBe(1);
    });

    it('should handle state loading failures gracefully in updateStep', async () => {
      const mockStorage = new MockStorage();
      mockStorage.setShouldFailLoad(true);
      
      const tracker = new PipelineTracker('test-token', '123456789', mockStorage);

      // This should not throw despite load failure
      let threwError = false;
      try {
        await tracker.updateStep(1, 3, 'Test Step', 'running', []);
      } catch (error) {
        threwError = true;
      }
      
      expect(threwError).toBe(false);

      // Verify error logging
      expect(errorLogs.some(log => log.includes('❌ Critical: Failed to load pipeline state from storage'))).toBe(true);
      expect(errorLogs.some(log => log.includes('Simulated storage load failure'))).toBe(true);
      expect(warnLogs.some(log => log.includes('⚠️  Operating with potentially stale state'))).toBe(true);
    });

    it('should continue operation with stale state when loading fails', async () => {
      const mockStorage = new MockStorage();
      const tracker = new PipelineTracker('test-token', '123456789', mockStorage);

      // Initialize first
      await tracker.initPipeline('123', 'Test PR', 'testuser', 'test/repo', 'main');
      
      // Now make loading fail
      mockStorage.setShouldFailLoad(true);
      mockStorage.resetCallCounts();

      // Should still attempt to process the step
      await tracker.updateStep(1, 3, 'Test Step', 'running', []);

      // Verify load was attempted
      expect(mockStorage.getLoadCallCount()).toBe(1);
      
      // Should warn about stale state
      expect(warnLogs.some(log => log.includes('potentially stale state'))).toBe(true);
    });
  });

  describe('Retry Logic in Discord API Calls', () => {
    it('should create DiscordApi with custom retry configuration', () => {
      const api = new DiscordApi('1234567890.abcdefghijklmnopqrstuvwxyz.abcdef', '123456789', {
        maxRetries: 5,
        baseDelay: 2000,
        maxDelay: 60000
      });
      
      expect(api).toBeInstanceOf(DiscordApi);
    });

    it('should create DiscordApi with default retry configuration', () => {
      const api = new DiscordApi('1234567890.abcdefghijklmnopqrstuvwxyz.abcdef', '123456789');
      
      expect(api).toBeInstanceOf(DiscordApi);
    });

    it('should validate retry configuration parameters', () => {
      // Test that DiscordApi accepts various retry configurations
      expect(() => new DiscordApi('1234567890.abcdefghijklmnopqrstuvwxyz.abcdef', '123456789', {
        maxRetries: 0
      })).not.toThrow();
      
      expect(() => new DiscordApi('1234567890.abcdefghijklmnopqrstuvwxyz.abcdef', '123456789', {
        baseDelay: 500
      })).not.toThrow();
      
      expect(() => new DiscordApi('1234567890.abcdefghijklmnopqrstuvwxyz.abcdef', '123456789', {
        maxDelay: 10000
      })).not.toThrow();
    });

    it('should handle partial retry configuration', () => {
      // Test that partial configuration works (merges with defaults)
      const api = new DiscordApi('1234567890.abcdefghijklmnopqrstuvwxyz.abcdef', '123456789', {
        maxRetries: 5 // Only override maxRetries
      });
      
      expect(api).toBeInstanceOf(DiscordApi);
    });
  });

  describe('Error Handling in State Management', () => {
    it('should handle state save failures before Discord API calls', async () => {
      const mockStorage = new MockStorage();
      const tracker = new PipelineTracker('test-token', '123456789', mockStorage);

      // Initialize first
      await tracker.initPipeline('123', 'Test PR', 'testuser', 'test/repo', 'main');
      
      // Clear logs from initialization
      errorLogs.length = 0;
      warnLogs.length = 0;
      
      // Make save fail
      mockStorage.setShouldFailSave(true);

      // Should not throw but should log errors
      await tracker.updateStep(1, 3, 'Test Step', 'running', []);

      expect(errorLogs.some(log => log.includes('❌ Critical: Failed to save pipeline state before Discord API call'))).toBe(true);
      expect(warnLogs.some(log => log.includes('⚠️  Aborting Discord update to maintain state consistency'))).toBe(true);
    });

    it('should validate state before saving', async () => {
      const mockStorage = new MockStorage();
      mockStorage.setShouldFailValidation(true);
      
      const tracker = new PipelineTracker('test-token', '123456789', mockStorage);

      // Initialize first
      await tracker.initPipeline('123', 'Test PR', 'testuser', 'test/repo', 'main');
      
      // Clear logs from initialization
      errorLogs.length = 0;
      
      // Should fail validation and not save
      await tracker.updateStep(1, 3, 'Test Step', 'running', []);

      expect(errorLogs.some(log => log.includes('State validation failed'))).toBe(true);
    });

    it('should handle missing PR info gracefully', async () => {
      const tracker = new PipelineTracker('test-token', '123456789');

      // Try to update step without initializing pipeline first
      await tracker.updateStep(1, 3, 'Test Step', 'running', []);

      expect(warnLogs.some(log => log.includes('⚠️  Cannot save state - missing PR info or pipeline start time'))).toBe(true);
      expect(warnLogs.some(log => log.includes('Skipping Discord update to prevent inconsistent state'))).toBe(true);
    });

    it('should handle error scenarios gracefully', async () => {
      const mockStorage = new MockStorage();
      const tracker = new PipelineTracker('test-token', '123456789', mockStorage);

      // Initialize first
      await tracker.initPipeline('123', 'Test PR', 'testuser', 'test/repo', 'main');
      
      // Reset counters
      mockStorage.resetCallCounts();
      errorLogs.length = 0;

      // Should save state before attempting Discord API calls
      await tracker.updateStep(1, 3, 'Test Step', 'running', []);

      // State should have been saved before Discord API call
      expect(mockStorage.getSaveCallCount()).toBe(1);
      expect(infoLogs.some(log => log.includes('✅ Pipeline state saved before Discord API call'))).toBe(true);
    });
  });

  describe('Unified Storage Initialization', () => {
    it('should use FileStorage by default when no storage provided', () => {
      const tracker = new PipelineTracker('test-token', '123456789');
      
      // We can't directly access private storage, but we can verify the tracker was created
      expect(tracker).toBeInstanceOf(PipelineTracker);
    });

    it('should accept custom storage implementation', () => {
      const customStorage = new InMemoryStorage();
      const tracker = new PipelineTracker('test-token', '123456789', customStorage);
      
      expect(tracker).toBeInstanceOf(PipelineTracker);
    });

    it('should work with FileStorage implementation', () => {
      const fileStorage = new FileStorage();
      const tracker = new PipelineTracker('test-token', '123456789', fileStorage);
      
      expect(tracker).toBeInstanceOf(PipelineTracker);
    });

    it('should validate FileStorage state correctly', () => {
      const fileStorage = new FileStorage();
      
      const validState: InternalPipelineState = {
        messageId: 'test-123',
        prNumber: 42,
        prTitle: 'Test PR',
        author: 'testuser',
        repository: 'test/repo',
        branch: 'main',
        steps: [],
        pipelineStartedAt: new Date()
      };

      expect(fileStorage.validateState(validState)).toBe(true);
    });

    it('should reject invalid state in FileStorage', () => {
      const fileStorage = new FileStorage();
      
      const invalidState = {
        messageId: '',
        prNumber: -1,
        prTitle: '',
        author: '',
        repository: '',
        branch: '',
        steps: 'not-an-array',
        pipelineStartedAt: 'invalid-date'
      } as any;

      expect(fileStorage.validateState(invalidState)).toBe(false);
    });

    it('should handle InMemoryStorage validation', () => {
      const memoryStorage = new InMemoryStorage();
      
      const validState: InternalPipelineState = {
        messageId: 'test-456',
        prNumber: 123,
        prTitle: 'Another Test PR',
        author: 'anotheruser',
        repository: 'another/repo',
        branch: 'develop',
        steps: [{
          number: 1,
          name: 'Test Step',
          status: 'running',
          additionalInfo: [['key', 'value']]
        }],
        pipelineStartedAt: new Date()
      };

      expect(memoryStorage.validateState(validState)).toBe(true);
    });
  });

  describe('State Persistence Before Discord API Calls', () => {
    it('should save state before attempting Discord API calls', async () => {
      const mockStorage = new MockStorage();
      const tracker = new PipelineTracker('test-token', '123456789', mockStorage);

      // Initialize first
      await tracker.initPipeline('123', 'Test PR', 'testuser', 'test/repo', 'main');
      
      // Reset counters
      mockStorage.resetCallCounts();

      await tracker.updateStep(1, 3, 'Test Step', 'running', []);

      // State should have been saved
      expect(mockStorage.getSaveCallCount()).toBe(1);
      expect(infoLogs.some(log => log.includes('✅ Pipeline state saved before Discord API call'))).toBe(true);
    });

    it('should abort Discord update if state save fails', async () => {
      const mockStorage = new MockStorage();
      mockStorage.setShouldFailSave(true);
      
      const tracker = new PipelineTracker('test-token', '123456789', mockStorage);

      // Initialize first
      await tracker.initPipeline('123', 'Test PR', 'testuser', 'test/repo', 'main');
      
      // Clear logs
      errorLogs.length = 0;
      warnLogs.length = 0;

      await tracker.updateStep(1, 3, 'Test Step', 'running', []);

      // Should abort Discord update due to save failure
      expect(warnLogs.some(log => log.includes('⚠️  Aborting Discord update to maintain state consistency'))).toBe(true);
    });

    it('should handle state persistence timing correctly', async () => {
      const mockStorage = new MockStorage();
      const tracker = new PipelineTracker('test-token', '123456789', mockStorage);

      // Initialize first
      await tracker.initPipeline('123', 'Test PR', 'testuser', 'test/repo', 'main');
      
      // Reset and clear logs
      mockStorage.resetCallCounts();
      errorLogs.length = 0;
      warnLogs.length = 0;

      await tracker.updateStep(1, 3, 'Test Step', 'running', []);

      // State should have been saved before Discord call attempt
      expect(mockStorage.getSaveCallCount()).toBe(1);
      expect(infoLogs.some(log => log.includes('✅ Pipeline state saved before Discord API call'))).toBe(true);
    });
  });

  describe('Integration Tests for All Fixes', () => {
    it('should handle complete workflow with all fixes working together', async () => {
      const mockStorage = new MockStorage();
      const tracker = new PipelineTracker('test-token', '123456789', mockStorage);

      // Initialize pipeline
      await tracker.initPipeline('123', 'Test PR', 'testuser', 'test/repo', 'main');
      
      // Reset counters
      mockStorage.resetCallCounts();

      // Update multiple steps
      await tracker.updateStep(1, 3, 'Step 1', 'success', [['duration', '30s']]);
      await tracker.updateStep(2, 3, 'Step 2', 'running', []);
      await tracker.updateStep(3, 3, 'Step 3', 'pending', []);

      // Verify state loading occurred for each update
      expect(mockStorage.getLoadCallCount()).toBe(3);
      
      // Verify state saving occurred before each Discord call attempt
      expect(mockStorage.getSaveCallCount()).toBe(3);
    });

    it('should recover gracefully from mixed failure scenarios', async () => {
      const mockStorage = new MockStorage();
      const tracker = new PipelineTracker('test-token', '123456789', mockStorage);

      // Initialize first
      await tracker.initPipeline('123', 'Test PR', 'testuser', 'test/repo', 'main');
      
      // Reset
      mockStorage.resetCallCounts();
      errorLogs.length = 0;
      warnLogs.length = 0;

      // First update: state load fails
      mockStorage.setShouldFailLoad(true);
      await tracker.updateStep(1, 3, 'Step 1', 'running', []);
      
      // Should continue despite load failure
      expect(errorLogs.some(log => log.includes('Failed to load pipeline state'))).toBe(true);
      expect(warnLogs.some(log => log.includes('potentially stale state'))).toBe(true);
      
      // Second update: state save fails
      mockStorage.setShouldFailLoad(false);
      mockStorage.setShouldFailSave(true);
      await tracker.updateStep(2, 3, 'Step 2', 'running', []);
      
      // Should abort Discord update
      expect(errorLogs.some(log => log.includes('Failed to save pipeline state before Discord API call'))).toBe(true);
      expect(warnLogs.some(log => log.includes('Aborting Discord update to maintain state consistency'))).toBe(true);
      
      // Third update: everything works
      mockStorage.setShouldFailSave(false);
      await tracker.updateStep(3, 3, 'Step 3', 'success', []);
      
      // Should work normally
      expect(mockStorage.getLoadCallCount()).toBe(3); // All three updates attempted load
    });
  });
});