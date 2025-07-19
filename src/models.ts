// Discord API Types
export interface DiscordMessage {
  content: string;
  embeds?: DiscordEmbed[];
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: DiscordField[];
  footer?: DiscordFooter;
  timestamp?: string;
  url?: string;
}

export interface DiscordField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordFooter {
  text: string;
  icon_url?: string;
}

// Pipeline Types
export enum StepStatus {
  Pending = 'pending',
  Running = 'running',
  Success = 'success',
  Failed = 'failed',
  Skipped = 'skipped',
}

export interface StepInfo {
  number: number;
  name: string;
  status: StepStatus;
  additionalInfo: Array<[string, string]>;
  completedAt?: Date;
}

export interface PrInfo {
  number: string;
  title: string;
  author: string;
  repository: string;
  branch: string;
}

export interface PipelineState {
  messageId: string;
  prNumber: number;
  prTitle: string;
  author: string;
  repository: string;
  branch: string;
  steps: StepInfo[];
  pipelineStartedAt: Date;
}

// Step Status Helper
export class StepStatusHelper {
  static fromStr(status: string): StepStatus | string {
    const normalizedStatus = status.toLowerCase().trim();

    switch (normalizedStatus) {
      case 'pending':
      case 'waiting':
        return StepStatus.Pending;
      case 'running':
      case 'in_progress':
      case 'in-progress':
        return StepStatus.Running;
      case 'success':
      case 'passed':
      case 'completed':
        return StepStatus.Success;
      case 'failed':
      case 'error':
        return StepStatus.Failed;
      case 'skipped':
      case 'ignore':
        return StepStatus.Skipped;
      default:
        return `Invalid status: ${status}`;
    }
  }

  static isValid(status: string): boolean {
    const result = this.fromStr(status);
    return typeof result === 'string' && result.startsWith('Invalid status:') === false;
  }

  static getColor(status: StepStatus): number {
    switch (status) {
      case StepStatus.Pending:
        return 0x808080; // Gray
      case StepStatus.Running:
        return 0x0099ff; // Blue
      case StepStatus.Success:
        return 0x00ff00; // Green
      case StepStatus.Failed:
        return 0xff0000; // Red
      case StepStatus.Skipped:
        return 0xffff00; // Yellow
      default:
        return 0x808080; // Gray
    }
  }

  static getEmoji(status: StepStatus): string {
    switch (status) {
      case StepStatus.Pending:
        return '⏳';
      case StepStatus.Running:
        return '🔄';
      case StepStatus.Success:
        return '✅';
      case StepStatus.Failed:
        return '❌';
      case StepStatus.Skipped:
        return '⏭️';
      default:
        return '❓';
    }
  }
}

// Step Info Manager
export class StepInfoManager {
  static new(
    number: number,
    name: string,
    status: StepStatus,
    additionalInfo: Array<[string, string]> = []
  ): StepInfo {
    return {
      number,
      name,
      status,
      additionalInfo,
    };
  }

  static markCompleted(step: StepInfo): void {
    step.completedAt = new Date();
  }

  static isCompleted(step: StepInfo): boolean {
    return (
      step.status === StepStatus.Success ||
      step.status === StepStatus.Failed ||
      step.status === StepStatus.Skipped
    );
  }

  static getProgress(steps: StepInfo[]): {
    completed: number;
    total: number;
    percentage: number;
  } {
    const total = steps.length;
    const completed = steps.filter((step) => this.isCompleted(step)).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
  }
}
