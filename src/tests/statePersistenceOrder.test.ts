import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { PipelineTracker, InMemoryStorage, InternalPipelineState } from '../pipelineTracker';

// Mock storage that tracks the order of operations
class OrderTrackingStorage extends InMemoryStorage {
  public operations: string[] = [];
  private shouldFailSave = false;

  setShouldFailSave(fail: boolean) {
    this.shouldFailSave = fail;
  }

  async savePipelineState(state: InternalPipelineState): Promise<void> {
    this.operations.push('save');
    if (this.shouldFailSave) {
      throw new Error('Simulated save failure');
    }
    return super.savePipelineState(state);
  }

  async loadPipelineState(): Promise<InternalPipelineState | null> {
    this.operations.push('load');
    return super.loadPipelineState();
  }
}

// Mock Discord API that tracks when it's called
class MockDiscordApi {
  public operations: string[] = [];
  private shouldFail = false;

  setShouldFail(fail: boolean) {
    this.shouldFail = fail;
  }

  async sendMessage(): Promise<string> {
    this.operations.push('sendMessage');
    if (this.shouldFail) {
      throw new Error('Discord API failure');
    }
    return 'mock-message-id';
  }

  async updateMessage(): Promise<void> {
    this.operations.push('updateMessage');
    if (this.shouldFail) {
      throw new Error('Discord API failure');
    }
  }
}

describe('State Persistence Order', () => {
  let originalConsoleError: typeof console.error;
  let originalConsoleWarn: typeof console.warn;
  let originalConsoleLog: typeof console.log;

  beforeEach(() => {
    // Suppress console output during tests
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;
    originalConsoleLog = console.log;
    console.error = () => {};
    console.warn = () => {};
    console.log = () => {};
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.log = originalConsoleLog;
  });

  it('should save state before Discord API calls in updateStep', async () => {
    const storage = new OrderTrackingStorage();
    const tracker = new PipelineTracker('test-token', '123456789', storage);

    // Mock the Discord API to track calls
    const mockApi = new MockDiscordApi();
    (tracker as any).api = mockApi;

    // Initialize pipeline first
    await tracker.initPipeline('123', 'Test PR', 'testuser', 'test/repo', 'main');

    // Clear operations to focus on updateStep
    storage.operations = [];
    mockApi.operations = [];

    // Update a step
    await tracker.updateStep(1, 3, 'Test Step', 'running', []);

    // Verify that state was saved before Discord API call
    const allOperations = [
      ...storage.operations.map(op => `storage:${op}`),
      ...mockApi.operations.map(op => `discord:${op}`)
    ];

    // Should have: load, save, then updateMessage
    expect(allOperations).toEqual([
      'storage:load',
      'storage:save',
      'discord:updateMessage'
    ]);
  });

  it('should not call Discord API if state saving fails', async () => {
    const storage = new OrderTrackingStorage();
    storage.setShouldFailSave(true);
    
    const tracker = new PipelineTracker('test-token', '123456789', storage);
    const mockApi = new MockDiscordApi();
    (tracker as any).api = mockApi;

    // Initialize pipeline first
    await tracker.initPipeline('123', 'Test PR', 'testuser', 'test/repo', 'main');

    // Clear operations and make save fail
    storage.operations = [];
    mockApi.operations = [];

    // Update a step - this should fail to save state and not call Discord
    await tracker.updateStep(1, 3, 'Test Step', 'running', []);

    // Should have attempted to load and save, but no Discord call
    expect(storage.operations).toEqual(['load', 'save']);
    expect(mockApi.operations).toEqual([]); // No Discord calls should happen
  });

  it('should maintain state consistency when Discord API fails', async () => {
    const storage = new OrderTrackingStorage();
    const tracker = new PipelineTracker('test-token', '123456789', storage);
    const mockApi = new MockDiscordApi();
    (tracker as any).api = mockApi;

    // Initialize pipeline first (this should succeed)
    await tracker.initPipeline('123', 'Test PR', 'testuser', 'test/repo', 'main');

    // Now make Discord fail for subsequent calls
    mockApi.setShouldFail(true);

    // Clear operations
    storage.operations = [];
    mockApi.operations = [];

    // Update a step - Discord will fail but state should be saved first
    await tracker.updateStep(1, 3, 'Test Step', 'running', []);

    // Should have saved state before attempting Discord call
    expect(storage.operations).toEqual(['load', 'save']);
    expect(mockApi.operations).toEqual(['updateMessage']); // Discord was attempted but failed

    // Verify state was actually saved with the step update
    const savedState = await storage.loadPipelineState();
    expect(savedState).not.toBeNull();
    expect(savedState!.steps).toHaveLength(1);
    expect(savedState!.steps[0].name).toBe('Test Step');
    expect(savedState!.steps[0].status).toBe('running');
  });
});