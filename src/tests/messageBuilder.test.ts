import { describe, it, expect } from "vitest";
import {
	buildInitEmbed,
	buildStepUpdateEmbed,
	buildCompletionEmbed,
} from "../messageBuilder";
import { StepInfo, StepStatus, StepInfoManager } from "../models";

describe("MessageBuilder", () => {
	it("should build the init embed correctly", () => {
		const prNumber = "123";
		const prTitle = "Test PR";
		const author = "testuser";
		const repository = "test/repo";
		const branch = "main";

		const embed = buildInitEmbed(prNumber, prTitle, author, repository, branch);

		expect(embed.title).toBe("🚀 Pipeline Started - PR #123");
		expect(embed.description).toBe("**Test PR**");
		expect(embed.color).toBe(0x0099ff); // Blue
		expect(embed.fields).toHaveLength(4);
		expect(embed.fields![0]).toEqual({
			name: "👤 Author",
			value: "testuser",
			inline: true,
		});
		expect(embed.fields![1]).toEqual({
			name: "📦 Repository",
			value: "test/repo",
			inline: true,
		});
		expect(embed.fields![2]).toEqual({
			name: "🌿 Branch",
			value: "main",
			inline: true,
		});
		expect(embed.fields![3]).toEqual({
			name: "📊 Status",
			value: "⏳ Initializing pipeline...",
			inline: false,
		});
	});

	it("should build the step update embed correctly for a pending step", () => {
		const prNumber = "123";
		const prTitle = "Test PR";
		const steps: StepInfo[] = [
			{
				number: 1,
				name: "Build",
				status: StepStatus.Pending,
				additionalInfo: [],
			},
			{
				number: 2,
				name: "Test",
				status: StepStatus.Pending,
				additionalInfo: [],
			},
		];
		const currentStep = 1;
		const totalSteps = 2;

		const embed = buildStepUpdateEmbed(
			prNumber,
			prTitle,
			steps,
			currentStep,
			totalSteps,
		);

		expect(embed.title).toBe("🔄 Pipeline Update - PR #123");
		expect(embed.description).toBe("**Test PR**");
		expect(embed.color).toBe(0x0099ff); // Blue for in progress
		expect(embed.fields!.length).toBeGreaterThan(0);
	});

	it("should build the step update embed correctly for a failed step", () => {
		const prNumber = "123";
		const prTitle = "Test PR";
		const steps: StepInfo[] = [
			{
				number: 1,
				name: "Build",
				status: StepStatus.Failed,
				additionalInfo: [],
			},
			{
				number: 2,
				name: "Test",
				status: StepStatus.Pending,
				additionalInfo: [],
			},
		];
		const currentStep = 1;
		const totalSteps = 2;

		const embed = buildStepUpdateEmbed(
			prNumber,
			prTitle,
			steps,
			currentStep,
			totalSteps,
		);

		expect(embed.title).toBe("🔄 Pipeline Update - PR #123");
		expect(embed.description).toBe("**Test PR**");
		expect(embed.color).toBe(0x0099ff); // Blue (not red yet since not all steps failed)
		expect(embed.fields!.length).toBeGreaterThan(0);
	});

	it("should build the step update embed correctly for a completed pipeline", () => {
		const prNumber = "123";
		const prTitle = "Test PR";
		const steps: StepInfo[] = [
			{
				number: 1,
				name: "Build",
				status: StepStatus.Success,
				additionalInfo: [],
			},
			{
				number: 2,
				name: "Test",
				status: StepStatus.Success,
				additionalInfo: [],
			},
		];
		const currentStep = 2;
		const totalSteps = 2;

		const embed = buildStepUpdateEmbed(
			prNumber,
			prTitle,
			steps,
			currentStep,
			totalSteps,
		);

		expect(embed.title).toBe("🔄 Pipeline Update - PR #123");
		expect(embed.description).toBe("**Test PR**");
		expect(embed.color).toBe(0x00ff00); // Green for success
		expect(embed.fields!.length).toBeGreaterThan(0);
	});

	it("should build the completion embed correctly for a successful pipeline", () => {
		const prNumber = "123";
		const prTitle = "Test PR";
		const steps: StepInfo[] = [
			{
				number: 1,
				name: "Build",
				status: StepStatus.Success,
				additionalInfo: [],
			},
			{
				number: 2,
				name: "Test",
				status: StepStatus.Success,
				additionalInfo: [],
			},
		];
		const totalSteps = 2;
		const startTime = new Date(Date.now() - 60000); // 1 minute ago

		const embed = buildCompletionEmbed(
			prNumber,
			prTitle,
			steps,
			totalSteps,
			startTime,
		);

		expect(embed.title).toBe("🎉 Pipeline Completed - PR #123");
		expect(embed.description).toBe("**Test PR**");
		expect(embed.color).toBe(0x00ff00); // Green for success
		expect(embed.fields!.length).toBeGreaterThan(0);
	});

	it("should build the completion embed correctly for a failed pipeline", () => {
		const prNumber = "123";
		const prTitle = "Test PR";
		const steps: StepInfo[] = [
			{
				number: 1,
				name: "Build",
				status: StepStatus.Failed,
				additionalInfo: [],
			},
			{
				number: 2,
				name: "Test",
				status: StepStatus.Pending,
				additionalInfo: [],
			},
		];
		const totalSteps = 2;
		const startTime = new Date(Date.now() - 60000); // 1 minute ago

		const embed = buildCompletionEmbed(
			prNumber,
			prTitle,
			steps,
			totalSteps,
			startTime,
		);

		expect(embed.title).toBe("💥 Pipeline Failed - PR #123");
		expect(embed.description).toBe("**Test PR**");
		expect(embed.color).toBe(0xff0000); // Red for failed
		expect(embed.fields!.length).toBeGreaterThan(0);
	});
});
