import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileStorage } from '../storage';
import { InternalPipelineState } from '../pipelineTracker';
import { StepStatus } from '../models';

describe('FileStorage State Validation and Backup', () => {
  let storage: FileStorage;
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    originalCwd = process.cwd();
    testDir = path.join(process.cwd(), 'test-storage-' + Date.now());
    await fs.mkdir(testDir, { recursive: true });
    process.chdir(testDir);
    
    storage = new FileStorage();
  });

  afterEach(async () => {
    // Clean up test directory
    process.chdir(originalCwd);
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  const createValidState = (): InternalPipelineState => ({
    messageId: 'test-message-123',
    prNumber: 42,
    prTitle: 'Test PR',
    author: 'testuser',
    repository: 'test/repo',
    branch: 'feature/test',
    steps: [
      {
        number: 1,
        name: 'Build',
        status: StepStatus.Success,
        additionalInfo: [['duration', '30s']],
        completedAt: new Date()
      }
    ],
    pipelineStartedAt: new Date()
  });

  describe('State Validation', () => {
    it('should validate a correct state', () => {
      const state = createValidState();
      expect(storage.validateState(state)).toBe(true);
    });

    it('should reject null state', () => {
      expect(storage.validateState(null as any)).toBe(false);
    });

    it('should reject state with invalid messageId', () => {
      const state = createValidState();
      state.messageId = 123 as any;
      expect(storage.validateState(state)).toBe(false);
    });

    it('should reject state with negative prNumber', () => {
      const state = createValidState();
      state.prNumber = -1;
      expect(storage.validateState(state)).toBe(false);
    });

    it('should reject state with empty prTitle', () => {
      const state = createValidState();
      state.prTitle = '';
      expect(storage.validateState(state)).toBe(false);
    });

    it('should reject state with invalid steps array', () => {
      const state = createValidState();
      state.steps = 'not an array' as any;
      expect(storage.validateState(state)).toBe(false);
    });

    it('should reject state with invalid step structure', () => {
      const state = createValidState();
      state.steps = [{ invalid: 'step' } as any];
      expect(storage.validateState(state)).toBe(false);
    });

    it('should reject state with invalid additionalInfo format', () => {
      const state = createValidState();
      state.steps[0].additionalInfo = [['key', 'value', 'extra'] as any];
      expect(storage.validateState(state)).toBe(false);
    });
  });

  describe('Backup Creation', () => {
    it('should create backup when main file exists', async () => {
      const state = createValidState();
      await storage.savePipelineState(state);
      
      // Verify main file exists
      const mainPath = storage.getFilePath();
      await fs.access(mainPath); // Should not throw
      
      // Create backup
      await storage.createBackup();
      
      // Verify backup exists
      const backupPath = storage.getBackupPath();
      await fs.access(backupPath); // Should not throw
      
      // Verify backup content matches main file
      const mainContent = await fs.readFile(mainPath, 'utf-8');
      const backupContent = await fs.readFile(backupPath, 'utf-8');
      expect(backupContent).toBe(mainContent);
    });

    it('should not fail when creating backup with no main file', async () => {
      // Should not throw when main file doesn't exist
      await expect(storage.createBackup()).resolves.toBeUndefined();
    });
  });

  describe('State Persistence with Backup', () => {
    it('should create backup before saving new state', async () => {
      const state1 = createValidState();
      state1.prNumber = 1;
      await storage.savePipelineState(state1);
      
      const state2 = createValidState();
      state2.prNumber = 2;
      await storage.savePipelineState(state2);
      
      // Load current state
      const currentState = await storage.loadPipelineState();
      expect(currentState?.prNumber).toBe(2);
      
      // Restore from backup
      const backupState = await storage.restoreFromBackup();
      expect(backupState?.prNumber).toBe(1);
    });

    it('should save state with metadata and checksum', async () => {
      const state = createValidState();
      await storage.savePipelineState(state);
      
      // Read raw file content to verify metadata structure
      const content = await fs.readFile(storage.getFilePath(), 'utf-8');
      const parsed = JSON.parse(content);
      
      expect(parsed).toHaveProperty('state');
      expect(parsed).toHaveProperty('metadata');
      expect(parsed.metadata).toHaveProperty('version');
      expect(parsed.metadata).toHaveProperty('lastUpdated');
      expect(parsed.metadata).toHaveProperty('checksum');
      expect(typeof parsed.metadata.checksum).toBe('string');
      expect(parsed.metadata.checksum).toHaveLength(64); // SHA-256 hex length
    });
  });

  describe('State Recovery', () => {
    it('should recover from corrupted main file using backup', async () => {
      const state = createValidState();
      await storage.savePipelineState(state);
      
      // Manually create a backup (since savePipelineState creates backup before saving)
      await storage.createBackup();
      
      // Corrupt the main file
      await fs.writeFile(storage.getFilePath(), 'corrupted json', 'utf-8');
      
      // Loading should recover from backup
      const recoveredState = await storage.loadPipelineState();
      expect(recoveredState).not.toBeNull();
      expect(recoveredState?.prNumber).toBe(state.prNumber);
      expect(recoveredState?.prTitle).toBe(state.prTitle);
    });

    it('should detect checksum mismatch and recover', async () => {
      const state = createValidState();
      await storage.savePipelineState(state);
      
      // Create backup before corrupting
      await storage.createBackup();
      
      // Manually corrupt the checksum in the main file
      const content = await fs.readFile(storage.getFilePath(), 'utf-8');
      const parsed = JSON.parse(content);
      parsed.metadata.checksum = 'invalid-checksum';
      await fs.writeFile(storage.getFilePath(), JSON.stringify(parsed), 'utf-8');
      
      // Loading should detect corruption and recover
      const recoveredState = await storage.loadPipelineState();
      expect(recoveredState).not.toBeNull();
      expect(recoveredState?.prNumber).toBe(state.prNumber);
    });

    it('should return null when both main and backup are corrupted', async () => {
      // Create corrupted main file
      await fs.writeFile(storage.getFilePath(), 'corrupted', 'utf-8');
      
      // Create corrupted backup file
      await fs.writeFile(storage.getBackupPath(), 'also corrupted', 'utf-8');
      
      // Should return null when recovery fails
      const state = await storage.loadPipelineState();
      expect(state).toBeNull();
    });

    it('should handle missing backup gracefully', async () => {
      // Create corrupted main file without backup
      await fs.writeFile(storage.getFilePath(), 'corrupted', 'utf-8');
      
      // Should return null when no backup exists
      const state = await storage.loadPipelineState();
      expect(state).toBeNull();
    });
  });

  describe('Legacy Format Support', () => {
    it('should load legacy format without metadata', async () => {
      const legacyState = {
        messageId: 'legacy-message',
        prNumber: 99,
        prTitle: 'Legacy PR',
        author: 'legacy-user',
        repository: 'legacy/repo',
        branch: 'legacy-branch',
        steps: [],
        pipelineStartedAt: new Date().toISOString()
      };
      
      // Write legacy format directly
      await fs.writeFile(storage.getFilePath(), JSON.stringify(legacyState), 'utf-8');
      
      // Should load successfully
      const loadedState = await storage.loadPipelineState();
      expect(loadedState).not.toBeNull();
      expect(loadedState?.messageId).toBe('legacy-message');
      expect(loadedState?.prNumber).toBe(99);
    });

    it('should upgrade legacy format on next save', async () => {
      const legacyState = {
        messageId: 'legacy-message',
        prNumber: 99,
        prTitle: 'Legacy PR',
        author: 'legacy-user',
        repository: 'legacy/repo',
        branch: 'legacy-branch',
        steps: [],
        pipelineStartedAt: new Date().toISOString()
      };
      
      // Write legacy format
      await fs.writeFile(storage.getFilePath(), JSON.stringify(legacyState), 'utf-8');
      
      // Load and save to upgrade format
      const loadedState = await storage.loadPipelineState();
      if (loadedState) {
        await storage.savePipelineState(loadedState);
      }
      
      // Verify new format with metadata
      const content = await fs.readFile(storage.getFilePath(), 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toHaveProperty('metadata');
      expect(parsed.metadata).toHaveProperty('checksum');
    });
  });

  describe('Cleanup Operations', () => {
    it('should clean up both main and backup files', async () => {
      const state = createValidState();
      await storage.savePipelineState(state);
      await storage.createBackup();
      
      // Verify both files exist
      await fs.access(storage.getFilePath()); // Should not throw
      await fs.access(storage.getBackupPath()); // Should not throw
      
      // Clear state
      await storage.clearPipelineState();
      
      // Verify both files are removed
      await expect(fs.access(storage.getFilePath())).rejects.toThrow();
      await expect(fs.access(storage.getBackupPath())).rejects.toThrow();
    });

    it('should handle cleanup when files do not exist', async () => {
      // Should not throw when files don't exist
      await expect(storage.clearPipelineState()).resolves.toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should reject invalid state during save', async () => {
      const invalidState = { invalid: 'state' } as any;
      await expect(storage.savePipelineState(invalidState)).rejects.toThrow('State validation failed');
    });

    it('should handle file system errors gracefully', async () => {
      // Create a state and save it
      const state = createValidState();
      await storage.savePipelineState(state);
      
      // Make directory read-only to simulate permission error
      // Note: This test might not work on all systems due to permission handling
      try {
        await fs.chmod(testDir, 0o444);
        await expect(storage.savePipelineState(state)).rejects.toThrow();
      } finally {
        // Restore permissions for cleanup
        await fs.chmod(testDir, 0o755);
      }
    });
  });
});