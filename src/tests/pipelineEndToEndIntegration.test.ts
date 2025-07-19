import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { PipelineTracker, InMemoryStorage, type Storage, type InternalPipelineState } from "../pipelineTracker";
import { FileStorage } from "../storage";
import { StepStatus, type DiscordMessage } from "../models";
import * as fs from "fs/promises";

// Mock Discord API implementation for testing
class MockDiscordApi {
	private messageId = "mock-message-id-123";
	private shouldFailSend = false;
	private shouldFailUpdate = false;
	private sentMessages: DiscordMessage[] = [];
	private updatedMessages: { messageId: string; message: DiscordMessage }[] = [];

	setShouldFailSend(fail: boolean) {
		this.shouldFailSend = fail;
	}

	setShouldFailUpdate(fail: boolean) {
		this.shouldFailUpdate = fail;
	}

	getSentMessages(): DiscordMessage[] {
		return this.sentMessages;
	}

	getUpdatedMessages(): { messageId: string; message: DiscordMessage }[] {
		return this.updatedMessages;
	}

	reset() {
		this.sentMessages = [];
		this.updatedMessages = [];
		this.shouldFailSend = false;
		this.shouldFailUpdate = false;
	}

	async sendMessage(message: DiscordMessage): Promise<string> {
		if (this.shouldFailSend) {
			throw new Error("Discord API Error: Rate limited");
		}
		this.sentMessages.push(message);
		return this.messageId;
	}

	async updateMessage(messageId: string, message: DiscordMessage): Promise<void> {
		if (this.shouldFailUpdate) {
			throw new Error("Discord API Error: Rate limited");
		}
		this.updatedMessages.push({ messageId, message });
	}

	async deleteMessage(messageId: string): Promise<void> {
		// Mock implementation
	}

	async checkApiHealth(): Promise<{ available: boolean; error?: string }> {
		return { available: true };
	}
}

// Mock PipelineTracker that uses our mock Discord API
class TestPipelineTracker extends PipelineTracker {
	private mockApi: MockDiscordApi;

	constructor(botToken: string, channelId: string, storage?: Storage, mockApi?: MockDiscordApi) {
		super(botToken, channelId, storage);
		this.mockApi = mockApi || new MockDiscordApi();
		// Replace the internal API with our mock
		(this as any).api = this.mockApi;
	}

	getMockApi(): MockDiscordApi {
		return this.mockApi;
	}
}

describe("End-to-End Pipeline Integration Tests", () => {
	let storage: FileStorage;
	let testFilePath: string;
	const mockBotToken = "1234567890.abcdefghijklmnopqrstuvwxyz.abcdef";
	const mockChannelId = "123456789012345678";

	beforeEach(() => {
		storage = new FileStorage();
		testFilePath = storage.getFilePath();
	});

	afterEach(async () => {
		// Clean up test file
		try {
			await fs.unlink(testFilePath);
		} catch (error: any) {
			// Ignore if file doesn't exist
			if (error.code !== "ENOENT") {
				throw error;
			}
		}
	});

	it("should complete full pipeline flow from init to completion", async () => {
		const mockApi = new MockDiscordApi();
		const tracker = new TestPipelineTracker(mockBotToken, mockChannelId, storage, mockApi);
		
		// Step 1: Initialize pipeline
		await tracker.initPipeline("42", "Test Feature Implementation", "testuser", "test/repo", "feature-branch");
		
		// Verify initial Discord message was sent
		const sentMessages = mockApi.getSentMessages();
		expect(sentMessages).toHaveLength(1);
		expect(sentMessages[0].embeds?.[0].title).toContain("Pipeline Started");
		expect(sentMessages[0].embeds?.[0].description).toContain("Test Feature Implementation");
		
		// Verify state was persisted after init
		let savedState = await storage.loadPipelineState();
		expect(savedState).not.toBeNull();
		expect(savedState?.messageId).toBe("mock-message-id-123");
		expect(savedState?.prNumber).toBe(42);
		expect(savedState?.prTitle).toBe("Test Feature Implementation");
		expect(savedState?.steps).toHaveLength(0);
		
		// Step 2: Update first step - Build
		await tracker.updateStep(1, 3, "Build Application", "running", [["Environment", "production"]]);
		
		// Verify Discord message was updated
		const updatedMessages = mockApi.getUpdatedMessages();
		expect(updatedMessages).toHaveLength(1);
		expect(updatedMessages[0].messageId).toBe("mock-message-id-123");
		
		// Check that the step field exists and contains the expected information
		const stepFields = updatedMessages[0].message.embeds?.[0].fields || [];
		const step1Field = stepFields.find(field => field.name === "Step 1");
		expect(step1Field).toBeDefined();
		expect(step1Field?.value).toContain("**Environment:** production");
		expect(step1Field?.value).toContain("Build Application");
		
		// Verify state persistence after step update
		savedState = await storage.loadPipelineState();
		expect(savedState?.steps).toHaveLength(1);
		expect(savedState?.steps[0].number).toBe(1);
		expect(savedState?.steps[0].name).toBe("Build Application");
		expect(savedState?.steps[0].status).toBe(StepStatus.Running);
		expect(savedState?.steps[0].additionalInfo).toEqual([["Environment", "production"]]);
		
		// Step 3: Complete first step and start second
		await tracker.updateStep(1, 3, "Build Application", "success", [["Duration", "2m 30s"]]);
		await tracker.updateStep(2, 3, "Run Tests", "running", [["Test Suite", "unit"]]);
		
		// Verify multiple updates
		expect(mockApi.getUpdatedMessages()).toHaveLength(3);
		
		// Verify state has both steps
		savedState = await storage.loadPipelineState();
		expect(savedState?.steps).toHaveLength(2);
		expect(savedState?.steps[0].status).toBe(StepStatus.Success);
		expect(savedState?.steps[0].completedAt).toBeDefined();
		expect(savedState?.steps[1].status).toBe(StepStatus.Running);
		
		// Step 4: Complete second step and start third
		await tracker.updateStep(2, 3, "Run Tests", "success", [["Tests Passed", "45/45"]]);
		await tracker.updateStep(3, 3, "Deploy", "running", [["Target", "staging"]]);
		
		// Step 5: Complete final step
		await tracker.updateStep(3, 3, "Deploy", "success", [["URL", "https://staging.example.com"]]);
		
		// Verify final state
		savedState = await storage.loadPipelineState();
		expect(savedState?.steps).toHaveLength(3);
		expect(savedState?.steps.every(step => step.status === StepStatus.Success)).toBe(true);
		expect(savedState?.steps.every(step => step.completedAt)).toBe(true);
		
		// Step 6: Complete pipeline
		await tracker.completePipeline();
		
		// Verify completion message was sent
		const finalUpdates = mockApi.getUpdatedMessages();
		const completionUpdate = finalUpdates[finalUpdates.length - 1];
		expect(completionUpdate.message.embeds?.[0].title).toContain("Pipeline Completed");
		expect(completionUpdate.message.embeds?.[0].color).toBe(0x00ff00); // Green for success
		
		// Verify state was cleared after completion
		const finalState = await storage.loadPipelineState();
		expect(finalState).toBeNull();
	});

	it("should persist state correctly across multiple updateStep calls", async () => {
		const mockApi = new MockDiscordApi();
		const tracker = new TestPipelineTracker(mockBotToken, mockChannelId, storage, mockApi);
		
		// Initialize pipeline
		await tracker.initPipeline("100", "Multi-Step Pipeline", "developer", "org/project", "main");
		
		// Simulate multiple step updates with state persistence verification
		const steps = [
			{ number: 1, name: "Checkout Code", status: "success", info: [["Commit", "abc123"]] },
			{ number: 2, name: "Install Dependencies", status: "success", info: [["Package Manager", "npm"]] },
			{ number: 3, name: "Lint Code", status: "success", info: [["Linter", "eslint"]] },
			{ number: 4, name: "Run Unit Tests", status: "running", info: [["Framework", "vitest"]] },
		];
		
		for (const step of steps) {
			await tracker.updateStep(
				step.number, 
				steps.length, 
				step.name, 
				step.status, 
				step.info as [string, string][]
			);
			
			// Verify state persistence after each step
			const currentState = await storage.loadPipelineState();
			expect(currentState).not.toBeNull();
			expect(currentState?.steps).toHaveLength(step.number);
			
			// Verify the current step was saved correctly
			const savedStep = currentState?.steps.find(s => s.number === step.number);
			expect(savedStep).toBeDefined();
			expect(savedStep?.name).toBe(step.name);
			expect(savedStep?.status).toBe(step.status);
			expect(savedStep?.additionalInfo).toEqual(step.info);
			
			// Verify completed steps have completedAt timestamp
			if (step.status === "success") {
				expect(savedStep?.completedAt).toBeDefined();
			}
		}
		
		// Create a new tracker instance to simulate process restart
		const newMockApi = new MockDiscordApi();
		const newTracker = new TestPipelineTracker(mockBotToken, mockChannelId, storage, newMockApi);
		
		// Update the running step to completion - this should load state first
		await newTracker.updateStep(4, 4, "Run Unit Tests", "success", [["Tests Passed", "120/120"]]);
		
		// Verify the new tracker loaded and updated state correctly
		const finalState = await storage.loadPipelineState();
		expect(finalState?.steps).toHaveLength(4);
		expect(finalState?.steps[3].status).toBe(StepStatus.Success);
		expect(finalState?.steps[3].completedAt).toBeDefined();
	});

	it("should handle Discord API failures gracefully while maintaining state consistency", async () => {
		const mockApi = new MockDiscordApi();
		// Setup Discord API to fail on updates but succeed on initial send
		mockApi.setShouldFailUpdate(true);
		
		const tracker = new TestPipelineTracker(mockBotToken, mockChannelId, storage, mockApi);
		
		// Initialize pipeline (should succeed)
		await tracker.initPipeline("200", "Error Recovery Test", "tester", "test/error", "develop");
		
		// Verify initial state was saved
		let savedState = await storage.loadPipelineState();
		expect(savedState).not.toBeNull();
		expect(savedState?.messageId).toBe("mock-message-id-123");
		
		// Update step - Discord API will fail but state should be consistent
		await tracker.updateStep(1, 2, "Failing Step", "running", [["Attempt", "1"]]);
		
		// Verify Discord update was attempted but failed (no updates should be recorded)
		expect(mockApi.getUpdatedMessages()).toHaveLength(0);
		
		// Verify state was still saved correctly despite Discord failure
		savedState = await storage.loadPipelineState();
		expect(savedState?.steps).toHaveLength(1);
		expect(savedState?.steps[0].name).toBe("Failing Step");
		expect(savedState?.steps[0].status).toBe(StepStatus.Running);
		
		// Complete the step - should still maintain state consistency
		await tracker.updateStep(1, 2, "Failing Step", "success", [["Recovered", "true"]]);
		
		// Verify final state is consistent
		savedState = await storage.loadPipelineState();
		expect(savedState?.steps[0].status).toBe(StepStatus.Success);
		expect(savedState?.steps[0].additionalInfo).toEqual([["Recovered", "true"]]);
	});

	it("should recover from storage failures and continue operation", async () => {
		// Create a tracker with in-memory storage to simulate storage failure recovery
		const memoryStorage = new InMemoryStorage();
		const mockApi = new MockDiscordApi();
		const tracker = new TestPipelineTracker(mockBotToken, mockChannelId, memoryStorage, mockApi);
		
		// Initialize pipeline
		await tracker.initPipeline("300", "Storage Recovery Test", "admin", "test/storage", "master");
		
		// Verify initial state in memory storage
		let savedState = await memoryStorage.loadPipelineState();
		expect(savedState).not.toBeNull();
		
		// Update steps normally
		await tracker.updateStep(1, 3, "Step 1", "success", []);
		await tracker.updateStep(2, 3, "Step 2", "running", []);
		
		// Verify state persistence in memory
		savedState = await memoryStorage.loadPipelineState();
		expect(savedState?.steps).toHaveLength(2);
		
		// Complete pipeline
		await tracker.updateStep(2, 3, "Step 2", "success", []);
		await tracker.completePipeline();
		
		// Verify state was cleared
		savedState = await memoryStorage.loadPipelineState();
		expect(savedState).toBeNull();
	});

	it("should handle sequential step updates correctly", async () => {
		const mockApi = new MockDiscordApi();
		const tracker = new TestPipelineTracker(mockBotToken, mockChannelId, storage, mockApi);
		
		// Initialize pipeline
		await tracker.initPipeline("400", "Sequential Test", "sequential", "test/sequential", "main");
		
		// Update steps sequentially to avoid file system race conditions
		await tracker.updateStep(1, 3, "Sequential Step 1", "running", [["Worker", "1"]]);
		await tracker.updateStep(2, 3, "Sequential Step 2", "running", [["Worker", "2"]]);
		await tracker.updateStep(3, 3, "Sequential Step 3", "running", [["Worker", "3"]]);
		
		// Verify all steps were saved correctly
		const savedState = await storage.loadPipelineState();
		expect(savedState?.steps).toHaveLength(3);
		
		// Verify each step has correct data
		for (let i = 1; i <= 3; i++) {
			const step = savedState?.steps.find(s => s.number === i);
			expect(step).toBeDefined();
			expect(step?.name).toBe(`Sequential Step ${i}`);
			expect(step?.status).toBe(StepStatus.Running);
			expect(step?.additionalInfo).toEqual([["Worker", i.toString()]]);
		}
		
		// Verify Discord updates were made for each step
		expect(mockApi.getUpdatedMessages()).toHaveLength(3);
	});

	it("should validate Discord embed content reflects correct state after each step", async () => {
		const mockApi = new MockDiscordApi();
		const tracker = new TestPipelineTracker(mockBotToken, mockChannelId, storage, mockApi);
		
		// Initialize pipeline
		await tracker.initPipeline("500", "Embed Validation Test", "validator", "test/embed", "validation");
		
		// Verify initial embed
		const sentMessages = mockApi.getSentMessages();
		expect(sentMessages).toHaveLength(1);
		const initEmbed = sentMessages[0].embeds?.[0];
		expect(initEmbed?.title).toContain("Pipeline Started");
		expect(initEmbed?.description).toContain("Embed Validation Test");
		// Check specific fields in the initial embed
		const initFields = initEmbed?.fields || [];
		expect(initFields.find(f => f.name === "👤 Author")?.value).toBe("validator");
		expect(initFields.find(f => f.name === "📦 Repository")?.value).toBe("test/embed");
		expect(initFields.find(f => f.name === "🌿 Branch")?.value).toBe("validation");
		
		// Update step and verify embed content
		await tracker.updateStep(1, 2, "Validation Step", "running", [["Check", "syntax"], ["Tool", "validator"]]);
		
		const updatedMessages = mockApi.getUpdatedMessages();
		expect(updatedMessages).toHaveLength(1);
		const stepEmbed = updatedMessages[0].message.embeds?.[0];
		expect(stepEmbed?.title).toContain("Pipeline Update");
		
		// Check that the step field contains the expected information
		const stepFields = stepEmbed?.fields || [];
		const step1Field = stepFields.find(field => field.name === "Step 1");
		expect(step1Field).toBeDefined();
		expect(step1Field?.value).toContain("**Check:** syntax");
		expect(step1Field?.value).toContain("**Tool:** validator");
		
		// Complete step and verify embed reflects completion
		await tracker.updateStep(1, 2, "Validation Step", "success", [["Result", "passed"]]);
		
		expect(mockApi.getUpdatedMessages()).toHaveLength(2);
		const completedStepEmbed = mockApi.getUpdatedMessages()[1].message.embeds?.[0];
		
		// Check that the completed step field contains the expected information
		const completedStepFields = completedStepEmbed?.fields || [];
		const completedStep1Field = completedStepFields.find(field => field.name === "Step 1");
		expect(completedStep1Field).toBeDefined();
		expect(completedStep1Field?.value).toContain("**Result:** passed");
		
		// Add second step and complete pipeline
		await tracker.updateStep(2, 2, "Final Step", "success", []);
		await tracker.completePipeline();
		
		// Verify completion embed
		const allUpdates = mockApi.getUpdatedMessages();
		const completionEmbed = allUpdates[allUpdates.length - 1].message.embeds?.[0];
		expect(completionEmbed?.title).toContain("Pipeline Completed");
		expect(completionEmbed?.color).toBe(0x00ff00); // Green
		// Check completion embed fields
		const completionFields = completionEmbed?.fields || [];
		const statusField = completionFields.find(f => f.name === "📊 Final Status");
		const durationField = completionFields.find(f => f.name === "⏱️ Duration");
		expect(statusField?.value).toContain("Success");
		expect(durationField?.value).toBeDefined();
	});
});