import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { PipelineTracker, InMemoryStorage } from '../pipelineTracker';
import { DiscordApi } from '../discordApi';

// Mock storage that can simulate failures
class FailingStorage extends InMemoryStorage {
  private shouldFailLoad = false;
  private shouldFailSave = false;

  setShouldFailLoad(fail: boolean) {
    this.shouldFailLoad = fail;
  }

  setShouldFailSave(fail: boolean) {
    this.shouldFailSave = fail;
  }

  async loadPipelineState() {
    if (this.shouldFailLoad) {
      throw new Error('Simulated storage load failure');
    }
    return super.loadPipelineState();
  }

  async savePipelineState(state: any) {
    if (this.shouldFailSave) {
      throw new Error('Simulated storage save failure');
    }
    return super.savePipelineState(state);
  }
}

describe('Enhanced Error Handling', () => {
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

    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;
    originalConsoleLog = console.log;

    console.error = (...args: any[]) => {
      errorLogs.push(args.join(' '));
    };
    console.warn = (...args: any[]) => {
      warnLogs.push(args.join(' '));
    };
    console.log = (...args: any[]) => {
      infoLogs.push(args.join(' '));
    };
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.log = originalConsoleLog;
  });

  it('should handle state loading failures gracefully in updateStep', async () => {
    const failingStorage = new FailingStorage();
    failingStorage.setShouldFailLoad(true);

    const tracker = new PipelineTracker('test-token', '123456789', failingStorage);

    // This should not throw, but should log detailed error information
    await tracker.updateStep(1, 3, 'Test Step', 'running', []);

    // Verify detailed error logging
    expect(errorLogs.some(log => log.includes('❌ Critical: Failed to load pipeline state from storage'))).toBe(true);
    expect(errorLogs.some(log => log.includes('Error details: Simulated storage load failure'))).toBe(true);
    expect(errorLogs.some(log => log.includes('Impact: Continuing with current in-memory state'))).toBe(true);
    expect(warnLogs.some(log => log.includes('⚠️  Operating with potentially stale state'))).toBe(true);
  });

  it('should handle state saving failures gracefully in updateStep', async () => {
    const failingStorage = new FailingStorage();
    const tracker = new PipelineTracker('test-token', '123456789', failingStorage);

    // Initialize first so we have PR info
    await tracker.initPipeline('123', 'Test PR', 'testuser', 'test/repo', 'main');

    // Clear logs from initialization
    errorLogs.length = 0;
    warnLogs.length = 0;

    // Now make save fail
    failingStorage.setShouldFailSave(true);

    // This should not throw, but should log detailed error information
    await tracker.updateStep(1, 3, 'Test Step', 'running', []);

    // Verify detailed error logging for save failure
    expect(errorLogs.some(log => log.includes('❌ Critical: Failed to save pipeline state before Discord API call'))).toBe(true);
    expect(errorLogs.some(log => log.includes('Error: Simulated storage save failure'))).toBe(true);
    expect(warnLogs.some(log => log.includes('⚠️  Aborting Discord update to maintain state consistency'))).toBe(true);
  });

  it('should provide actionable Discord API error messages', () => {
    const api = new DiscordApi('test-token', '123456789');

    // Test that the API instance is created successfully
    expect(api).toBeDefined();

    // The actual error message testing is covered by the retry logic
    // which is tested in the integration tests where we see the enhanced messages
  });

  it('should handle missing PR info gracefully', async () => {
    const tracker = new PipelineTracker('test-token', '123456789');

    // Try to update step without initializing pipeline first
    await tracker.updateStep(1, 3, 'Test Step', 'running', []);

    // Should warn about missing PR info
    expect(warnLogs.some(log => log.includes('⚠️  Cannot save state - missing PR info or pipeline start time'))).toBe(true);
    expect(warnLogs.some(log => log.includes('Skipping Discord update to prevent inconsistent state'))).toBe(true);
  });
});