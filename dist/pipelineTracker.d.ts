import { type StepInfo } from './models';
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
export interface Storage {
    savePipelineState(state: InternalPipelineState): Promise<void>;
    clearPipelineState(): Promise<void>;
    loadPipelineState(): Promise<InternalPipelineState | null>;
    validateState?(state: InternalPipelineState): boolean;
    createBackup?(): Promise<void>;
    restoreFromBackup?(): Promise<InternalPipelineState | null>;
}
export declare class InMemoryStorage implements Storage {
    private state;
    savePipelineState(state: InternalPipelineState): Promise<void>;
    clearPipelineState(): Promise<void>;
    loadPipelineState(): Promise<InternalPipelineState | null>;
    validateState(state: InternalPipelineState): boolean;
    private isValidState;
}
export declare class PipelineTracker {
    private api;
    private storage;
    private messageId;
    private steps;
    private prInfo;
    private pipelineStartedAt;
    constructor(botToken: string, channelId: string, storage?: Storage);
    initPipeline(prNumber: string, prTitle: string, author: string, repository: string, branch: string): Promise<void>;
    updateStep(stepNumber: number, totalSteps: number, stepName: string, status: string, additionalInfo: [string, string][]): Promise<void>;
    completePipeline(): Promise<void>;
    loadState(): Promise<void>;
    private validateStateBeforeSaving;
    private saveStateWithValidation;
}
//# sourceMappingURL=pipelineTracker.d.ts.map