import { type PipelineState } from './models';
export interface Storage {
    savePipelineState(state: PipelineState): Promise<void>;
    clearPipelineState(): Promise<void>;
    loadPipelineState(): Promise<PipelineState | null>;
}
export declare class InMemoryStorage implements Storage {
    private state;
    savePipelineState(state: PipelineState): Promise<void>;
    clearPipelineState(): Promise<void>;
    loadPipelineState(): Promise<PipelineState | null>;
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
}
//# sourceMappingURL=pipelineTracker.d.ts.map