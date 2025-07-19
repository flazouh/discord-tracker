import { describe, test, expect } from 'bun:test';
import { FileStorage } from '../storage';
import { InternalPipelineState } from '../pipelineTracker';
import { StepStatus } from '../models';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Date Serialization Tests', () => {
  test('should properly serialize and deserialize Date objects', async () => {
    const storage = new FileStorage();
    const testDate = new Date('2024-01-01T12:00:00Z');
    
    const testState: InternalPipelineState = {
      messageId: 'test-message-id',
      prNumber: 123,
      prTitle: 'Test PR',
      author: 'test-author',
      repository: 'test-repo',
      branch: 'main',
      steps: [
        {
          number: 1,
          name: 'Test Step',
          status: StepStatus.Success,
          additionalInfo: [],
          completedAt: testDate
        }
      ],
      pipelineStartedAt: testDate
    };

    // Save the state
    await storage.savePipelineState(testState);

    // Load the state
    const loadedState = await storage.loadPipelineState();

    // Verify that the loaded state has proper Date objects
    expect(loadedState).not.toBeNull();
    expect(loadedState!.pipelineStartedAt).toBeInstanceOf(Date);
    expect(loadedState!.pipelineStartedAt.getTime()).toBe(testDate.getTime());
    expect(loadedState!.steps[0].completedAt).toBeInstanceOf(Date);
    expect(loadedState!.steps[0].completedAt!.getTime()).toBe(testDate.getTime());

    // Clean up
    await storage.clearPipelineState();
  });

  test('should handle missing completedAt dates gracefully', async () => {
    const storage = new FileStorage();
    const testDate = new Date('2024-01-01T12:00:00Z');
    
    const testState: InternalPipelineState = {
      messageId: 'test-message-id',
      prNumber: 123,
      prTitle: 'Test PR',
      author: 'test-author',
      repository: 'test-repo',
      branch: 'main',
      steps: [
        {
          number: 1,
          name: 'Test Step',
          status: StepStatus.Pending,
          additionalInfo: [],
          // No completedAt date
        }
      ],
      pipelineStartedAt: testDate
    };

    // Save the state
    await storage.savePipelineState(testState);

    // Load the state
    const loadedState = await storage.loadPipelineState();

    // Verify that the loaded state handles missing completedAt
    expect(loadedState).not.toBeNull();
    expect(loadedState!.pipelineStartedAt).toBeInstanceOf(Date);
    expect(loadedState!.steps[0].completedAt).toBeUndefined();

    // Clean up
    await storage.clearPipelineState();
  });
}); 