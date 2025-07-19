import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { TrackerError } from './error';
/// File-based storage implementation that implements the Storage interface
export class FileStorage {
    filePath;
    backupPath;
    VERSION = '1.0.0';
    constructor() {
        // Get current directory and construct file path
        // In Node.js, process.cwd() gives the current working directory
        const currentDir = process.cwd();
        this.filePath = path.join(currentDir, '.discord-pipeline-state');
        this.backupPath = path.join(currentDir, '.discord-pipeline-state.backup');
    }
    /// Calculates checksum for state integrity validation
    calculateChecksum(state) {
        const stateString = JSON.stringify(state, Object.keys(state).sort());
        return crypto.createHash('sha256').update(stateString).digest('hex');
    }
    /// Validates state with comprehensive checks and returns detailed result
    validateStateDetailed(state) {
        const errors = [];
        let canRecover = true;
        // Basic validation checks
        if (!state || typeof state !== 'object') {
            errors.push('State is not a valid object');
            canRecover = false;
            return { isValid: false, errors, canRecover };
        }
        if (typeof state.messageId !== 'string') {
            errors.push('messageId must be a string');
        }
        if (typeof state.prNumber !== 'number' || state.prNumber < 0) {
            errors.push('prNumber must be a non-negative number');
        }
        if (typeof state.prTitle !== 'string' || state.prTitle.trim() === '') {
            errors.push('prTitle must be a non-empty string');
        }
        if (typeof state.author !== 'string' || state.author.trim() === '') {
            errors.push('author must be a non-empty string');
        }
        if (typeof state.repository !== 'string' || state.repository.trim() === '') {
            errors.push('repository must be a non-empty string');
        }
        if (typeof state.branch !== 'string' || state.branch.trim() === '') {
            errors.push('branch must be a non-empty string');
        }
        if (!Array.isArray(state.steps)) {
            errors.push('steps must be an array');
            canRecover = false;
        }
        if (!(state.pipelineStartedAt instanceof Date) && typeof state.pipelineStartedAt !== 'string') {
            errors.push('pipelineStartedAt must be a Date or string');
        }
        // Validate each step if steps array is valid
        if (Array.isArray(state.steps)) {
            for (let i = 0; i < state.steps.length; i++) {
                const step = state.steps[i];
                if (!step || typeof step !== 'object') {
                    errors.push(`Step ${i} is not a valid object`);
                    continue;
                }
                if (typeof step.number !== 'number' || step.number <= 0) {
                    errors.push(`Step ${i} number must be a positive number`);
                }
                if (typeof step.name !== 'string' || step.name.trim() === '') {
                    errors.push(`Step ${i} name must be a non-empty string`);
                }
                if (typeof step.status !== 'string') {
                    errors.push(`Step ${i} status must be a string`);
                }
                if (!Array.isArray(step.additionalInfo)) {
                    errors.push(`Step ${i} additionalInfo must be an array`);
                    continue;
                }
                // Validate additional info array contains valid tuples
                for (let j = 0; j < step.additionalInfo.length; j++) {
                    const info = step.additionalInfo[j];
                    if (!Array.isArray(info) || info.length !== 2) {
                        errors.push(`Step ${i} additionalInfo[${j}] must be a tuple of length 2`);
                    }
                    else if (typeof info[0] !== 'string' || typeof info[1] !== 'string') {
                        errors.push(`Step ${i} additionalInfo[${j}] must contain only strings`);
                    }
                }
            }
        }
        return { isValid: errors.length === 0, errors, canRecover };
    }
    /// Validates state before saving to prevent corruption (public interface)
    validateState(state) {
        return this.validateStateDetailed(state).isValid;
    }
    /// Creates a backup of the current state file before modifications
    async createBackup() {
        try {
            // Check if main state file exists
            await fs.access(this.filePath);
            // Copy the current state file to backup location
            await fs.copyFile(this.filePath, this.backupPath);
        }
        catch (error) {
            // If main file doesn't exist, no backup needed
            if (error.code !== 'ENOENT') {
                throw TrackerError.fileSystemError(error);
            }
        }
    }
    /// Attempts to restore state from backup file
    async restoreFromBackup() {
        try {
            const content = await fs.readFile(this.backupPath, 'utf-8');
            if (content.trim() === '') {
                return null;
            }
            // Try to parse as new format first
            try {
                const stateWithMetadata = JSON.parse(content);
                if (stateWithMetadata.state && stateWithMetadata.metadata) {
                    // Validate checksum
                    const calculatedChecksum = this.calculateChecksum(stateWithMetadata.state);
                    if (calculatedChecksum === stateWithMetadata.metadata.checksum) {
                        // Convert Date strings back to Date objects
                        const state = {
                            ...stateWithMetadata.state,
                            pipelineStartedAt: new Date(stateWithMetadata.state.pipelineStartedAt),
                            steps: stateWithMetadata.state.steps.map((step) => ({
                                ...step,
                                completedAt: step.completedAt ? new Date(step.completedAt) : undefined
                            }))
                        };
                        return state;
                    }
                }
            }
            catch {
                // Fall through to legacy format parsing
            }
            // Try legacy format
            const rawState = JSON.parse(content);
            const state = {
                ...rawState,
                pipelineStartedAt: new Date(rawState.pipelineStartedAt),
                steps: rawState.steps.map((step) => ({
                    ...step,
                    completedAt: step.completedAt ? new Date(step.completedAt) : undefined
                }))
            };
            return state;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return null; // No backup file exists
            }
            throw TrackerError.jsonError(error);
        }
    }
    /// Attempts to recover from corrupted state file using backup or validation
    async recoverCorruptedState() {
        try {
            // First, try to restore from backup
            const backupState = await this.restoreFromBackup();
            if (backupState) {
                const validation = this.validateStateDetailed(backupState);
                if (validation.isValid) {
                    // Restore the main file from backup
                    await fs.copyFile(this.backupPath, this.filePath);
                    return backupState;
                }
            }
            // If backup is also corrupted or doesn't exist, return null
            // This will cause the system to start with a fresh state
            return null;
        }
        catch (error) {
            // If recovery fails completely, return null to start fresh
            return null;
        }
    }
    /// Saves the current pipeline state to a file with backup and validation
    async savePipelineState(state) {
        try {
            // Validate state before saving
            const validation = this.validateStateDetailed(state);
            if (!validation.isValid) {
                throw new Error(`State validation failed: ${validation.errors.join(', ')}`);
            }
            // Create backup before modifying the main file
            await this.createBackup();
            // Create state with metadata including checksum
            const checksum = this.calculateChecksum(state);
            const stateWithMetadata = {
                state,
                metadata: {
                    version: this.VERSION,
                    lastUpdated: new Date().toISOString(),
                    checksum
                }
            };
            const json = JSON.stringify(stateWithMetadata, null, 2);
            await fs.writeFile(this.filePath, json, 'utf-8');
        }
        catch (error) {
            throw TrackerError.fileSystemError(error);
        }
    }
    /// Loads the pipeline state from a file with validation and recovery
    async loadPipelineState() {
        try {
            const content = await fs.readFile(this.filePath, 'utf-8');
            // Check if content is empty AFTER reading it successfully
            if (content.trim() === '') {
                return null; // File is empty
            }
            // Try to parse as new format with metadata first
            try {
                const stateWithMetadata = JSON.parse(content);
                if (stateWithMetadata.state && stateWithMetadata.metadata) {
                    // Validate checksum for integrity
                    const calculatedChecksum = this.calculateChecksum(stateWithMetadata.state);
                    if (calculatedChecksum !== stateWithMetadata.metadata.checksum) {
                        console.warn('State file checksum mismatch, attempting recovery...');
                        return await this.recoverCorruptedState();
                    }
                    // Convert Date strings back to Date objects
                    const state = {
                        ...stateWithMetadata.state,
                        pipelineStartedAt: new Date(stateWithMetadata.state.pipelineStartedAt),
                        steps: stateWithMetadata.state.steps.map((step) => ({
                            ...step,
                            completedAt: step.completedAt ? new Date(step.completedAt) : undefined
                        }))
                    };
                    // Validate the loaded state
                    const validation = this.validateStateDetailed(state);
                    if (!validation.isValid) {
                        console.warn('Loaded state failed validation, attempting recovery...');
                        return await this.recoverCorruptedState();
                    }
                    return state;
                }
            }
            catch {
                // Fall through to legacy format parsing
            }
            // Try legacy format for backward compatibility
            const rawState = JSON.parse(content);
            const state = {
                ...rawState,
                pipelineStartedAt: new Date(rawState.pipelineStartedAt),
                steps: rawState.steps.map((step) => ({
                    ...step,
                    completedAt: step.completedAt ? new Date(step.completedAt) : undefined
                }))
            };
            // Validate legacy state
            const validation = this.validateStateDetailed(state);
            if (!validation.isValid) {
                console.warn('Legacy state failed validation, attempting recovery...');
                return await this.recoverCorruptedState();
            }
            return state;
        }
        catch (error) {
            // If file doesn't exist, return null
            if (error.code === 'ENOENT') {
                return null;
            }
            // If JSON parsing fails, attempt recovery
            console.warn('State file parsing failed, attempting recovery...');
            try {
                return await this.recoverCorruptedState();
            }
            catch (recoveryError) {
                // If recovery also fails, throw the original error
                throw TrackerError.jsonError(error);
            }
        }
    }
    /// Clears the pipeline state file and backup
    async clearPipelineState() {
        try {
            await fs.unlink(this.filePath);
        }
        catch (error) {
            // If file doesn't exist, it's already cleared, so ignore error
            if (error.code !== 'ENOENT') {
                throw TrackerError.fileSystemError(error);
            }
        }
        // Also clean up backup file
        try {
            await fs.unlink(this.backupPath);
        }
        catch (error) {
            // If backup doesn't exist, ignore error
            if (error.code !== 'ENOENT') {
                // Log but don't throw - backup cleanup failure shouldn't break the main operation
                console.warn('Failed to clean up backup file:', error.message);
            }
        }
    }
    getFilePath() {
        return this.filePath;
    }
    getBackupPath() {
        return this.backupPath;
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
        }
        catch (error) {
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
        }
        catch (error) {
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
        }
        catch (error) {
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
        }
        else {
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