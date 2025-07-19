export declare class PipelineTracker {
  constructor(botToken: string, channelId: string);
  initPipeline(
    prNumber: string,
    prTitle: string,
    author: string,
    repository: string,
    branch: string
  ): Promise<void>;
  updateStep(
    stepNum: number,
    total: number,
    stepName: string,
    status: string,
    additionalInfo: Array<[string, string]>
  ): Promise<void>;
  completePipeline(): Promise<void>;
}
//# sourceMappingURL=pipeline_tracker.d.ts.map
