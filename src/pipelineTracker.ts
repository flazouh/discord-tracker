import { DiscordApi } from './discordApi';
import { TrackerError } from './error';
import { buildCompletionEmbed, buildInitEmbed, buildStepUpdateEmbed } from './messageBuilder';
import {
  type DiscordMessage,
  type PipelineState,
  type PrInfo,
  type StepInfo,
  StepInfoManager,
  StepStatus,
  StepStatusHelper,
} from './models';

// Internal pipeline state interface (matches file storage format)
export interface InternalPipelineState {
	messageId: string;
	prNumber: number;
	prTitle: string;
	author: string;
	repository: string;
	branch: string;
	steps: StepInfo[];
	pipelineStartedAt: Date;
}

// Storage interface for dependency injection
export interface Storage {
	savePipelineState(state: InternalPipelineState): Promise<void>;
	clearPipelineState(): Promise<void>;
	loadPipelineState(): Promise<InternalPipelineState | null>;
}

// In-memory storage implementation (for testing and simple use cases)
export class InMemoryStorage implements Storage {
  private state: InternalPipelineState | null = null;

  async savePipelineState(state: InternalPipelineState): Promise<void> {
    this.state = state;
  }

  async clearPipelineState(): Promise<void> {
    this.state = null;
  }

  async loadPipelineState(): Promise<InternalPipelineState | null> {
    return this.state;
  }
}

/// Main pipeline tracker that orchestrates Discord notifications
export class PipelineTracker {
  private api: DiscordApi;
  private storage: Storage;
  private messageId: string | undefined;
  private steps: StepInfo[];
  private prInfo: PrInfo | undefined;
  private pipelineStartedAt: Date | undefined;

  constructor(botToken: string, channelId: string, storage?: Storage) {
    this.api = new DiscordApi(botToken, channelId);
    this.storage = storage || new InMemoryStorage();
    this.messageId = undefined;
    this.steps = [];
    this.prInfo = undefined;
    this.pipelineStartedAt = undefined;
  }

  /// Initializes the pipeline tracking
  async initPipeline(
    prNumber: string,
    prTitle: string,
    author: string,
    repository: string,
    branch: string
  ): Promise<void> {
    this.prInfo = {
      number: prNumber,
      title: prTitle,
      author: author,
      repository: repository,
      branch: branch,
    };

    this.pipelineStartedAt = new Date();

    const embed = buildInitEmbed(prNumber, prTitle, author, repository, branch);
    const message: DiscordMessage = {
      content: '',
      embeds: [embed],
    };

    const messageId = await this.api.sendMessage(message);
    this.messageId = messageId;

    // Save state
    const state: InternalPipelineState = {
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
  async updateStep(
    stepNumber: number,
    totalSteps: number,
    stepName: string,
    status: string,
    additionalInfo: [string, string][]
  ): Promise<void> {
    if (stepNumber <= 0 || totalSteps <= 0 || stepNumber > totalSteps) {
      throw TrackerError.invalidStepNumber(stepNumber);
    }

    const stepStatus = StepStatusHelper.fromStr(status) as StepStatus;
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
    } else {
      // Create new step
      step = StepInfoManager.new(stepNumber, stepName, stepStatus, additionalInfo);
      this.steps.push(step);
    }

    // Mark step as completed if it's finished
    if (
      stepStatus === StepStatus.Success ||
      stepStatus === StepStatus.Failed ||
      stepStatus === StepStatus.Skipped
    ) {
      StepInfoManager.markCompleted(step);
    }

    // Update Discord message
    if (this.prInfo && this.pipelineStartedAt) {
      const embed = buildStepUpdateEmbed(
        this.prInfo.number,
        this.prInfo.title,
        this.steps,
        stepNumber,
        totalSteps
      );

      const message: DiscordMessage = {
        content: '',
        embeds: [embed],
      };

      if (this.messageId) {
        await this.api.updateMessage(this.messageId, message);
      }
    }

    // Save state
    if (this.prInfo && this.pipelineStartedAt) {
      const state: PipelineState = {
        messageId: this.messageId || '',
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
  async completePipeline(): Promise<void> {
    // Load state from storage first (critical for GitHub Actions)
    await this.loadState();

    if (this.prInfo && this.pipelineStartedAt) {
      const totalSteps = this.steps.length > 0 ? this.steps.length : 1;
      const embed = buildCompletionEmbed(
        this.prInfo.number,
        this.prInfo.title,
        this.steps,
        totalSteps,
        this.pipelineStartedAt
      );

      const message: DiscordMessage = {
        content: '',
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
  async loadState(): Promise<void> {
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
}
