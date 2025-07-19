import { DiscordApi } from './discordApi';
import { TrackerError } from './error';
import { buildCompletionEmbed, buildInitEmbed, buildStepUpdateEmbed } from './messageBuilder';
import { StepInfoManager, StepStatus, StepStatusHelper, } from './models';
// In-memory storage implementation (for testing and simple use cases)
export class InMemoryStorage {
    state = null;
    async savePipelineState(state) {
        this.state = state;
    }
    async clearPipelineState() {
        this.state = null;
    }
    async loadPipelineState() {
        return this.state;
    }
    validateState(state) {
        return this.isValidState(state);
    }
    isValidState(state) {
        // Basic validation checks
        if (!state || typeof state !== 'object')
            return false;
        if (typeof state.messageId !== 'string')
            return false;
        if (typeof state.prNumber !== 'number' || state.prNumber < 0)
            return false;
        if (typeof state.prTitle !== 'string' || state.prTitle.trim() === '')
            return false;
        if (typeof state.author !== 'string' || state.author.trim() === '')
            return false;
        if (typeof state.repository !== 'string' || state.repository.trim() === '')
            return false;
        if (typeof state.branch !== 'string' || state.branch.trim() === '')
            return false;
        if (!Array.isArray(state.steps))
            return false;
        if (!(state.pipelineStartedAt instanceof Date) && typeof state.pipelineStartedAt !== 'string')
            return false;
        // Validate each step
        for (const step of state.steps) {
            if (!step || typeof step !== 'object')
                return false;
            if (typeof step.number !== 'number' || step.number <= 0)
                return false;
            if (typeof step.name !== 'string' || step.name.trim() === '')
                return false;
            if (typeof step.status !== 'string')
                return false;
            if (!Array.isArray(step.additionalInfo))
                return false;
        }
        return true;
    }
}
/// Main pipeline tracker that orchestrates Discord notifications
export class PipelineTracker {
    api;
    storage;
    messageId;
    steps;
    prInfo;
    pipelineStartedAt;
    constructor(botToken, channelId, storage) {
        this.api = new DiscordApi(botToken, channelId);
        this.storage = storage || new InMemoryStorage();
        this.messageId = undefined;
        this.steps = [];
        this.prInfo = undefined;
        this.pipelineStartedAt = undefined;
    }
    /// Initializes the pipeline tracking
    async initPipeline(prNumber, prTitle, author, repository, branch) {
        this.prInfo = {
            number: prNumber,
            title: prTitle,
            author: author,
            repository: repository,
            branch: branch,
        };
        this.pipelineStartedAt = new Date();
        const embed = buildInitEmbed(prNumber, prTitle, author, repository, branch);
        const message = {
            content: '',
            embeds: [embed],
        };
        try {
            const messageId = await this.api.sendMessage(message);
            this.messageId = messageId;
            console.log(`✅ Pipeline tracking initialized - Discord message created (ID: ${messageId})`);
        }
        catch (error) {
            console.error('❌ Failed to create initial Discord message');
            console.error('   Error:', error instanceof Error ? error.message : String(error));
            console.warn('⚠️  Pipeline will continue without Discord notifications');
            console.warn('   Check Discord API status, bot permissions, and channel accessibility');
            // Continue without Discord - set messageId to undefined so we know Discord is unavailable
            this.messageId = undefined;
        }
        // Save state - always attempt this even if Discord initialization failed
        const state = {
            messageId: this.messageId || '',
            prNumber: parseInt(prNumber, 10) || 0,
            prTitle: prTitle,
            author: author,
            repository: repository,
            branch: branch,
            steps: this.steps,
            pipelineStartedAt: this.pipelineStartedAt,
        };
        try {
            await this.storage.savePipelineState(state);
            console.log('✅ Pipeline state saved successfully');
        }
        catch (error) {
            console.error('❌ Critical: Failed to save initial pipeline state');
            console.error('   Error:', error instanceof Error ? error.message : String(error));
            console.error('   Impact: Subsequent step updates may fail or be inconsistent');
            console.error('   Recommendation: Check file system permissions and storage configuration');
            // This is critical - if we can't save state, subsequent operations will likely fail
            // But we don't throw here to allow the pipeline to attempt to continue
            console.warn('⚠️  Continuing with degraded functionality - state persistence disabled');
        }
    }
    /// Updates a step in the pipeline
    async updateStep(stepNumber, totalSteps, stepName, status, additionalInfo) {
        // Load state from storage first (critical for GitHub Actions)
        try {
            await this.loadState();
        }
        catch (error) {
            console.error('❌ Critical: Failed to load pipeline state from storage');
            console.error('   Error details:', error instanceof Error ? error.message : String(error));
            console.error('   Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
            console.error('   Impact: Continuing with current in-memory state, which may be stale or incomplete');
            console.error('   Recommendation: Check file system permissions and storage configuration');
            // Continue with current in-memory state if loading fails
            // This allows the system to continue operating even if state loading fails
            console.warn('⚠️  Operating with potentially stale state - Discord updates may be inconsistent');
        }
        if (stepNumber <= 0 || totalSteps <= 0 || stepNumber > totalSteps) {
            throw TrackerError.invalidStepNumber(stepNumber);
        }
        const stepStatus = StepStatusHelper.fromStr(status);
        if (typeof stepStatus !== 'string') {
            throw TrackerError.invalidStatus(status);
        }
        // Find or create step
        let step = this.steps.find((s) => s.number === stepNumber);
        if (step) {
            // Update existing step
            step.name = stepName;
            step.status = stepStatus;
            step.additionalInfo = additionalInfo;
        }
        else {
            // Create new step
            step = StepInfoManager.new(stepNumber, stepName, stepStatus, additionalInfo);
            this.steps.push(step);
        }
        // Mark step as completed if it's finished
        if (stepStatus === StepStatus.Success ||
            stepStatus === StepStatus.Failed ||
            stepStatus === StepStatus.Skipped) {
            StepInfoManager.markCompleted(step);
        }
        // Save state BEFORE Discord API calls to ensure consistency (Requirements 4.1, 4.2)
        if (this.prInfo && this.pipelineStartedAt) {
            const state = {
                messageId: this.messageId || '',
                prNumber: parseInt(this.prInfo.number, 10) || 0,
                prTitle: this.prInfo.title,
                author: this.prInfo.author,
                repository: this.prInfo.repository,
                branch: this.prInfo.branch,
                steps: this.steps,
                pipelineStartedAt: this.pipelineStartedAt,
            };
            try {
                await this.saveStateWithValidation(state);
                console.log(`✅ Pipeline state saved before Discord API call for step ${stepNumber}`);
            }
            catch (error) {
                console.error('❌ Critical: Failed to save pipeline state before Discord API call');
                console.error('   Step details:', { stepNumber, stepName, status });
                console.error('   Error:', error instanceof Error ? error.message : String(error));
                console.error('   Impact: Cannot proceed with Discord update due to state persistence failure');
                console.warn('⚠️  Aborting Discord update to maintain state consistency');
                console.warn('   Recommendation: Check file system permissions and available disk space');
                // Don't proceed with Discord API call if state saving failed
                // This ensures state consistency as per requirement 4.2
                return;
            }
        }
        else {
            console.warn('⚠️  Cannot save state - missing PR info or pipeline start time');
            console.warn('   Skipping Discord update to prevent inconsistent state');
            return;
        }
        // Update Discord message with graceful degradation
        // State is already saved, so Discord failures won't affect consistency
        if (this.prInfo && this.pipelineStartedAt) {
            const embed = buildStepUpdateEmbed(this.prInfo.number, this.prInfo.title, this.steps, stepNumber, totalSteps);
            const message = {
                content: '',
                embeds: [embed],
            };
            if (this.messageId) {
                try {
                    await this.api.updateMessage(this.messageId, message);
                    console.log(`✅ Discord message updated successfully for step ${stepNumber}: ${stepName}`);
                }
                catch (error) {
                    console.error('❌ Discord API unavailable - step update failed but state remains consistent');
                    console.error('   Step details:', { stepNumber, stepName, status });
                    console.error('   Error:', error instanceof Error ? error.message : String(error));
                    console.warn('⚠️  Pipeline tracking continues locally with consistent state');
                    console.warn('   Users will not see real-time updates until Discord API is restored');
                    console.warn('   Consider checking Discord API status and bot permissions');
                    // State was already saved before the Discord call, so consistency is maintained
                    // This satisfies requirement 4.2: "WHEN Discord API calls fail THEN the local state SHALL remain consistent"
                }
            }
            else {
                console.warn('⚠️  No Discord message ID available - cannot update Discord embed');
                console.warn('   This may indicate the initial message creation failed');
            }
        }
        else {
            console.warn('⚠️  Missing PR info or pipeline start time - cannot update Discord message');
            console.warn('   This may indicate incomplete pipeline initialization');
        }
    }
    /// Completes the pipeline
    async completePipeline() {
        // Load state from storage first (critical for GitHub Actions)
        try {
            await this.loadState();
        }
        catch (error) {
            console.error('❌ Critical: Failed to load pipeline state during completion');
            console.error('   Error details:', error instanceof Error ? error.message : String(error));
            console.error('   Impact: Final Discord update may be incomplete or missing');
            console.warn('⚠️  Proceeding with completion using available state');
        }
        if (this.prInfo && this.pipelineStartedAt) {
            const totalSteps = this.steps.length > 0 ? this.steps.length : 1;
            const embed = buildCompletionEmbed(this.prInfo.number, this.prInfo.title, this.steps, totalSteps, this.pipelineStartedAt);
            const message = {
                content: '',
                embeds: [embed],
            };
            if (this.messageId) {
                try {
                    await this.api.updateMessage(this.messageId, message);
                    console.log('✅ Pipeline completion message sent to Discord successfully');
                }
                catch (error) {
                    console.error('❌ Discord API unavailable - completion notification failed');
                    console.error('   Error:', error instanceof Error ? error.message : String(error));
                    console.warn('⚠️  Pipeline completed successfully but Discord notification failed');
                    console.warn('   Users will not see the completion status in Discord');
                }
            }
            else {
                console.warn('⚠️  No Discord message ID available for completion update');
            }
        }
        else {
            console.warn('⚠️  Missing PR info or pipeline start time for completion');
        }
        // Clear state - always attempt this even if Discord updates failed
        try {
            await this.storage.clearPipelineState();
            console.log('✅ Pipeline state cleared successfully');
        }
        catch (error) {
            console.error('❌ Failed to clear pipeline state after completion');
            console.error('   Error:', error instanceof Error ? error.message : String(error));
            console.warn('⚠️  State file may need manual cleanup');
        }
    }
    /// Loads pipeline state from storage
    async loadState() {
        const state = await this.storage.loadPipelineState();
        if (state) {
            this.messageId = state.messageId;
            this.steps = state.steps;
            this.prInfo = {
                number: state.prNumber.toString(),
                title: state.prTitle,
                author: state.author,
                repository: state.repository,
                branch: state.branch,
            };
            // Convert string back to Date object when loading from JSON
            this.pipelineStartedAt = new Date(state.pipelineStartedAt);
        }
    }
    /// Validates state before saving to prevent corruption
    validateStateBeforeSaving(state) {
        // Use storage's validation if available, otherwise use built-in validation
        if (this.storage.validateState) {
            return this.storage.validateState(state);
        }
        // Built-in validation as fallback
        if (!state || typeof state !== 'object')
            return false;
        if (typeof state.messageId !== 'string')
            return false;
        if (typeof state.prNumber !== 'number' || state.prNumber < 0)
            return false;
        if (typeof state.prTitle !== 'string' || state.prTitle.trim() === '')
            return false;
        if (typeof state.author !== 'string' || state.author.trim() === '')
            return false;
        if (typeof state.repository !== 'string' || state.repository.trim() === '')
            return false;
        if (typeof state.branch !== 'string' || state.branch.trim() === '')
            return false;
        if (!Array.isArray(state.steps))
            return false;
        if (!(state.pipelineStartedAt instanceof Date) && typeof state.pipelineStartedAt !== 'string')
            return false;
        // Validate each step
        for (const step of state.steps) {
            if (!step || typeof step !== 'object')
                return false;
            if (typeof step.number !== 'number' || step.number <= 0)
                return false;
            if (typeof step.name !== 'string' || step.name.trim() === '')
                return false;
            if (typeof step.status !== 'string')
                return false;
            if (!Array.isArray(step.additionalInfo))
                return false;
        }
        return true;
    }
    /// Safely saves state with validation
    async saveStateWithValidation(state) {
        // Validate state before saving to prevent corruption
        if (!this.validateStateBeforeSaving(state)) {
            console.error('❌ State validation failed - refusing to save corrupted state');
            console.error('   State details:', JSON.stringify(state, null, 2));
            throw new Error('State validation failed - cannot save corrupted state');
        }
        try {
            await this.storage.savePipelineState(state);
        }
        catch (error) {
            console.error('❌ Critical: Failed to save validated pipeline state');
            console.error('   Error:', error instanceof Error ? error.message : String(error));
            throw error; // Re-throw to let caller handle
        }
    }
}
//# sourceMappingURL=pipelineTracker.js.map