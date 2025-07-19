import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { FileStorage } from "../storage";
import * as fs from "fs/promises";
import * as path from "path";

describe("FileStorage", () => {
	let storage: FileStorage;
	let testFilePath: string;

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

	it("should save and load pipeline state correctly", async () => {
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

		// Save state
		await storage.savePipelineState(testState);

		// Load state
		const loadedState = await storage.loadPipelineState();

		expect(loadedState).not.toBeNull();
		expect(loadedState?.messageId).toBe("test-message-123");
		expect(loadedState?.prNumber).toBe(42);
		expect(loadedState?.prTitle).toBe("Test PR");
		expect(loadedState?.author).toBe("testuser");
		expect(loadedState?.repository).toBe("test/repo");
		expect(loadedState?.branch).toBe("main");
		expect(loadedState?.steps).toEqual([]);
	});

	it("should return null when no state file exists", async () => {
		const loadedState = await storage.loadPipelineState();
		expect(loadedState).toBeNull();
	});

	it("should clear pipeline state correctly", async () => {
		const testState = {
			messageId: "test-message-456",
			prNumber: 43,
			prTitle: "Another Test PR",
			author: "anotheruser",
			repository: "another/repo",
			branch: "develop",
			steps: [],
			pipelineStartedAt: new Date(),
		};

		// Save state
		await storage.savePipelineState(testState);

		// Verify state exists
		let loadedState = await storage.loadPipelineState();
		expect(loadedState).not.toBeNull();

		// Clear state
		await storage.clearPipelineState();

		// Verify state is cleared
		loadedState = await storage.loadPipelineState();
		expect(loadedState).toBeNull();
	});
});