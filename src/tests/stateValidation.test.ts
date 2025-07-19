import { describe, expect, it } from 'bun:test';
import { InMemoryStorage, InternalPipelineState } from '../pipelineTracker';
import { FileStorage } from '../storage';
import { StepStatus } from '../models';

describe('State Validation', () => {
  it('should validate correct state structure', () => {
    const storage = new InMemoryStorage();
    const validState: InternalPipelineState = {
      messageId: 'test-message-id',
      prNumber: 123,
      prTitle: 'Test PR',
      author: 'testuser',
      repository: 'test/repo',
      branch: 'main',
      steps: [
        {
          number: 1,
          name: 'Test Step',
          status: StepStatus.Running,
          additionalInfo: [['key', 'value']],
          completedAt: undefined
        }
      ],
      pipelineStartedAt: new Date()
    };

    expect(storage.validateState(validState)).toBe(true);
  });

  it('should reject invalid state with missing required fields', () => {
    const storage = new InMemoryStorage();
    const invalidState = {
      messageId: 'test-message-id',
      // Missing prNumber
      prTitle: 'Test PR',
      author: 'testuser',
      repository: 'test/repo',
      branch: 'main',
      steps: [],
      pipelineStartedAt: new Date()
    } as InternalPipelineState;

    expect(storage.validateState(invalidState)).toBe(false);
  });

  it('should reject invalid state with invalid step structure', () => {
    const storage = new InMemoryStorage();
    const invalidState: InternalPipelineState = {
      messageId: 'test-message-id',
      prNumber: 123,
      prTitle: 'Test PR',
      author: 'testuser',
      repository: 'test/repo',
      branch: 'main',
      steps: [
        {
          number: 0, // Invalid step number
          name: 'Test Step',
          status: StepStatus.Running,
          additionalInfo: [['key', 'value']],
          completedAt: undefined
        }
      ],
      pipelineStartedAt: new Date()
    };

    expect(storage.validateState(invalidState)).toBe(false);
  });

  it('should validate state in FileStorage', () => {
    const storage = new FileStorage();
    const validState: InternalPipelineState = {
      messageId: 'test-message-id',
      prNumber: 123,
      prTitle: 'Test PR',
      author: 'testuser',
      repository: 'test/repo',
      branch: 'main',
      steps: [
        {
          number: 1,
          name: 'Test Step',
          status: StepStatus.Success,
          additionalInfo: [['Duration', '30s'], ['Status', 'OK']],
          completedAt: new Date()
        }
      ],
      pipelineStartedAt: new Date()
    };

    expect(storage.validateState(validState)).toBe(true);
  });

  it('should reject state with invalid additional info format', () => {
    const storage = new FileStorage();
    const invalidState: InternalPipelineState = {
      messageId: 'test-message-id',
      prNumber: 123,
      prTitle: 'Test PR',
      author: 'testuser',
      repository: 'test/repo',
      branch: 'main',
      steps: [
        {
          number: 1,
          name: 'Test Step',
          status: StepStatus.Success,
          additionalInfo: [['key']] as any, // Invalid - should be tuples of 2 strings
          completedAt: new Date()
        }
      ],
      pipelineStartedAt: new Date()
    };

    expect(storage.validateState(invalidState)).toBe(false);
  });
});