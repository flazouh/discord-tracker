import { StepInfo } from './models';
import { Storage, InternalPipelineState } from './pipelineTracker';
interface LegacyPipelineState {
    message_id: string;
    pr_number: number;
    pr_title: string;
    author: string;
    repository: string;
    branch: string;
    steps: StepInfo[];
    pipeline_started_at: Date;
}
export declare class FileStorage implements Storage {
    private filePath;
    constructor();
    savePipelineState(state: InternalPipelineState): Promise<void>;
    loadPipelineState(): Promise<InternalPipelineState | null>;
    clearPipelineState(): Promise<void>;
    getFilePath(): string;
}
export declare class MessageStorage {
    private filePath;
    constructor();
    savePipelineState(state: LegacyPipelineState): Promise<void>;
    loadPipelineState(): Promise<LegacyPipelineState | undefined>;
    clearPipelineState(): Promise<void>;
    saveMessageId(messageId: string): Promise<void>;
    loadMessageId(): Promise<string | undefined>;
    clearMessageId(): Promise<void>;
    getFilePath(): string;
}
export {};
//# sourceMappingURL=storage.d.ts.map