import * as fs from 'fs/promises';
import * as path from 'path';
import { TrackerError } from './error';
/// File-based storage implementation that implements the Storage interface
export class FileStorage {
  filePath;
  constructor() {
    // Get current directory and construct file path
    // In Node.js, process.cwd() gives the current working directory
    const currentDir = process.cwd();
    this.filePath = path.join(currentDir, '.discord-pipeline-state');
  }
  /// Saves the current pipeline state to a file
  async savePipelineState(state) {
    try {
      const json = JSON.stringify(state, null, 2); // Pretty print JSON
      await fs.writeFile(this.filePath, json, 'utf-8');
    } catch (error) {
      throw TrackerError.fileSystemError(error);
    }
  }
  /// Loads the pipeline state from a file
  async loadPipelineState() {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      // Check if content is empty AFTER reading it successfully
      if (content.trim() === '') {
        return null; // File is empty
      }
      const state = JSON.parse(content);
      return state;
    } catch (error) {
      // If file doesn't exist, return null
      if (error.code === 'ENOENT') {
        return null;
      }
      // If JSON parsing fails, it might be corrupted, treat as non-existent or throw
      throw TrackerError.jsonError(error);
    }
  }
  /// Clears the pipeline state file
  async clearPipelineState() {
    try {
      await fs.unlink(this.filePath);
    } catch (error) {
      // If file doesn't exist, it's already cleared, so ignore error
      if (error.code !== 'ENOENT') {
        throw TrackerError.fileSystemError(error);
      }
    }
  }
  getFilePath() {
    return this.filePath;
  }
}
/// Legacy MessageStorage class for backward compatibility
export class MessageStorage {
  filePath;
  constructor() {
    // Get current directory and construct file path
    // In Node.js, process.cwd() gives the current working directory
    const currentDir = process.cwd();
    this.filePath = path.join(currentDir, '.discord-pipeline-state');
  }
  /// Saves the current pipeline state to a file
  async savePipelineState(state) {
    try {
      const json = JSON.stringify(state, null, 2); // Pretty print JSON
      await fs.writeFile(this.filePath, json, 'utf-8');
    } catch (error) {
      throw TrackerError.fileSystemError(error);
    }
  }
  /// Loads the pipeline state from a file
  async loadPipelineState() {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      // Check if content is empty AFTER reading it successfully
      if (content.trim() === '') {
        return undefined; // File is empty
      }
      const state = JSON.parse(content);
      return state;
    } catch (error) {
      // If file doesn't exist, return undefined
      if (error.code === 'ENOENT') {
        return undefined;
      }
      // If JSON parsing fails, it might be corrupted, treat as non-existent or throw
      throw TrackerError.jsonError(error);
    }
  }
  /// Clears the pipeline state file
  async clearPipelineState() {
    try {
      await fs.unlink(this.filePath);
    } catch (error) {
      // If file doesn't exist, it's already cleared, so ignore error
      if (error.code !== 'ENOENT') {
        throw TrackerError.fileSystemError(error);
      }
    }
  }
  // Legacy methods for backward compatibility (simplified for TS)
  // These might need more robust handling if the old file format differs significantly
  async saveMessageId(messageId) {
    let state = await this.loadPipelineState();
    if (!state) {
      // Create a new state if none exists
      state = {
        message_id: messageId,
        pr_number: 0,
        pr_title: 'Unknown',
        author: 'Unknown',
        repository: 'Unknown',
        branch: 'Unknown',
        steps: [],
        pipeline_started_at: new Date(),
      };
    } else {
      state.message_id = messageId;
    }
    await this.savePipelineState(state);
  }
  async loadMessageId() {
    const state = await this.loadPipelineState();
    return state?.message_id;
  }
  async clearMessageId() {
    // This effectively clears the entire state, which is what clearPipelineState does
    await this.clearPipelineState();
  }
  getFilePath() {
    return this.filePath;
  }
}
//# sourceMappingURL=storage.js.map
