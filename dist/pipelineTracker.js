import { DiscordApi } from "./discordApi";
import { TrackerError } from "./error";
import { StepStatus, StepInfoManager, StepStatusHelper, } from "./models";
import { buildInitEmbed, buildStepUpdateEmbed, buildCompletionEmbed, } from "./messageBuilder";
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
            content: "",
            embeds: [embed],
        };
        const messageId = await this.api.sendMessage(message);
        this.messageId = messageId;
        // Save state
        const state = {
            messageId: messageId,
            prNumber: parseInt(prNumber, 10) || 0,
            prTitle: prTitle,
            author: author,
            repository: repository,
            branch: branch,
            steps: this.steps,
            pipelineStartedAt: this.pipelineStartedAt,
        };
        await this.storage.savePipelineState(state);
    }
    /// Updates a step in the pipeline
    async updateStep(stepNumber, totalSteps, stepName, status, additionalInfo) {
        if (stepNumber <= 0 || totalSteps <= 0 || stepNumber > totalSteps) {
            throw TrackerError.invalidStepNumber(stepNumber);
        }
        const stepStatus = StepStatusHelper.fromStr(status);
        if (typeof stepStatus !== "string") {
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
        // Update Discord message
        if (this.prInfo && this.pipelineStartedAt) {
            const embed = buildStepUpdateEmbed(this.prInfo.number, this.prInfo.title, this.steps, stepNumber, totalSteps);
            const message = {
                content: "",
                embeds: [embed],
            };
            if (this.messageId) {
                await this.api.updateMessage(this.messageId, message);
            }
        }
        // Save state
        if (this.prInfo && this.pipelineStartedAt) {
            const state = {
                messageId: this.messageId || "",
                prNumber: parseInt(this.prInfo.number, 10) || 0,
                prTitle: this.prInfo.title,
                author: this.prInfo.author,
                repository: this.prInfo.repository,
                branch: this.prInfo.branch,
                steps: this.steps,
                pipelineStartedAt: this.pipelineStartedAt,
            };
            await this.storage.savePipelineState(state);
        }
    }
    /// Completes the pipeline
    async completePipeline() {
        if (this.prInfo && this.pipelineStartedAt) {
            const totalSteps = this.steps.length > 0 ? this.steps.length : 1;
            const embed = buildCompletionEmbed(this.prInfo.number, this.prInfo.title, this.steps, totalSteps, this.pipelineStartedAt);
            const message = {
                content: "",
                embeds: [embed],
            };
            if (this.messageId) {
                await this.api.updateMessage(this.messageId, message);
            }
        }
        // Clear state
        await this.storage.clearPipelineState();
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
            this.pipelineStartedAt = state.pipelineStartedAt;
        }
    }
}
//# sourceMappingURL=pipelineTracker.js.map