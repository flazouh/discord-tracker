import { StepInfo } from "./models";
interface PipelineState {
    message_id: string;
    pr_number: number;
    pr_title: string;
    author: string;
    repository: string;
    branch: string;
    steps: StepInfo[];
    pipeline_started_at: Date;
}
export declare class MessageStorage {
    private filePath;
    constructor();
    savePipelineState(state: PipelineState): Promise<void>;
    loadPipelineState(): Promise<PipelineState | undefined>;
    clearPipelineState(): Promise<void>;
    saveMessageId(messageId: string): Promise<void>;
    loadMessageId(): Promise<string | undefined>;
    clearMessageId(): Promise<void>;
    getFilePath(): string;
}
export {};
//# sourceMappingURL=storage.d.ts.map