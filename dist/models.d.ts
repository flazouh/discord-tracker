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
export declare enum StepStatus {
    Pending = "pending",
    Running = "running",
    Success = "success",
    Failed = "failed",
    Skipped = "skipped"
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
export declare class StepStatusHelper {
    static fromStr(status: string): StepStatus | string;
    static isValid(status: string): boolean;
    static getColor(status: StepStatus): number;
    static getEmoji(status: StepStatus): string;
}
export declare class StepInfoManager {
    static new(number: number, name: string, status: StepStatus, additionalInfo?: Array<[string, string]>): StepInfo;
    static markCompleted(step: StepInfo): void;
    static isCompleted(step: StepInfo): boolean;
    static getProgress(steps: StepInfo[]): {
        completed: number;
        total: number;
        percentage: number;
    };
}
//# sourceMappingURL=models.d.ts.map