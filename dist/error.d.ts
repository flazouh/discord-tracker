export declare class TrackerError extends Error {
    readonly code?: string | undefined;
    constructor(message: string, code?: string | undefined);
    static invalidStepNumber(stepNumber: number): TrackerError;
    static invalidStatus(status: string): TrackerError;
    static discordApiError(message: string, statusCode?: number): TrackerError;
    static missingRequiredInput(inputName: string): TrackerError;
    static invalidAction(action: string): TrackerError;
    static fileSystemError(error: Error): TrackerError;
    static jsonError(error: Error): TrackerError;
    static invalidBotToken(): TrackerError;
    static invalidChannelId(): TrackerError;
    static stateLoadError(error: Error): TrackerError;
    static stateSaveError(error: Error): TrackerError;
    static discordUnavailable(operation: string): TrackerError;
}
//# sourceMappingURL=error.d.ts.map