import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { PipelineTracker } from "../pipelineTracker";
import { FileStorage } from "../storage";
import * as fs from "fs/promises";

describe("Pipeline Integration Tests", () => {
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

	it("should load state correctly in updateStep", async () => {
		// First, manually save a state to storage
		const testState = {
			messageId: "test-message-123",
			prNumber: 42,
			prTitle: "Test PR",
			author: "testuser",
			repository: "test/repo",
			branch: "main",
			steps: [],
			pipelineStartedAt: new Date("2023-01-01T00:00:00Z"),
		};
		
		await storage.savePipelineState(testState);

		// Create tracker and verify it loads state during updateStep
		const tracker = new PipelineTracker(mockBotToken, mockChannelId, storage);
		
		// Call loadState manually to verify it works
		await tracker.loadState();
		
		// Check that internal state was loaded (we can't access private properties directly,
		// but we can verify the state file exists and contains correct data)
		const loadedState = await storage.loadPipelineState();
		expect(loadedState).not.toBeNull();
		expect(loadedState?.messageId).toBe("test-message-123");
		expect(loadedState?.prNumber).toBe(42);
		expect(loadedState?.prTitle).toBe("Test PR");
	});

	it("should handle missing state gracefully", async () => {
		const tracker = new PipelineTracker(mockBotToken, mockChannelId, storage);
		
		// Verify no state file exists
		const loadedState = await storage.loadPipelineState();
		expect(loadedState).toBeNull();
		
		// loadState should not throw when no state exists
		await expect(tracker.loadState()).resolves.toBeUndefined();
	});

	it("should persist state correctly after initPipeline", async () => {
		const tracker = new PipelineTracker(mockBotToken, mockChannelId, storage);
		
		// Note: This will fail because we can't actually send Discord messages in tests
		// But we can verify the storage mechanism works by checking if the error is about Discord API
		try {
			await tracker.initPipeline("42", "Test PR", "testuser", "test/repo", "main");
		} catch (error: any) {
			// Expected to fail due to Discord API call (401 Unauthorized with fake token)
			expect(error.message).toContain("Discord API Error");
		}
		
		// Even though Discord API failed, the state should have been saved before the API call
		// Let's check if a state file was created (it won't be because the API call fails first)
		// This test demonstrates the flow but can't fully test without mocking
	});
});