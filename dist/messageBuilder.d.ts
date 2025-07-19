import { DiscordEmbed, StepInfo } from './models';
export declare function buildInitEmbed(prNumber: string, prTitle: string, author: string, repository: string, branch: string): DiscordEmbed;
export declare function buildStepUpdateEmbed(prNumber: string, prTitle: string, steps: StepInfo[], currentStep: number, totalSteps: number): DiscordEmbed;
export declare function buildCompletionEmbed(prNumber: string, prTitle: string, steps: StepInfo[], totalSteps: number, startTime: Date): DiscordEmbed;
//# sourceMappingURL=messageBuilder.d.ts.map