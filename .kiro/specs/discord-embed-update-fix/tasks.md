# Implementation Plan

- [x] 1. Fix critical state loading issue in updateStep method
  - Add `await this.loadState()` call at the beginning of the `updateStep` method in `src/pipelineTracker.ts`
  - Ensure state is loaded before any step processing logic
  - Add error handling for state loading failures
  - _Requirements: 1.1, 2.2_

- [x] 2. Unify storage initialization across entry points
  - Modify `src/main.ts` to use FileStorage instead of default InMemoryStorage
  - Create consistent PipelineTracker initialization pattern between `main.ts` and `index.ts`
  - Remove the inconsistency where some entry points use FileStorage and others don't
  - _Requirements: 2.1, 2.3_

- [x] 3. Add retry logic for Discord API operations
  - Implement retry mechanism in `src/discordApi.ts` for `sendMessage` and `updateMessage` methods
  - Add exponential backoff with configurable retry attempts (default 3)
  - Handle different error types appropriately (rate limiting vs network errors)
  - _Requirements: 3.3, 3.4_

- [x] 4. Improve error handling and logging throughout the system
  - Add detailed error logging in `updateStep` method when state loading fails
  - Enhance error messages in Discord API calls to be more actionable
  - Add graceful degradation when Discord API is unavailable
  - _Requirements: 3.1, 3.2_

- [x] 5. Add state persistence before Discord API calls
  - Modify `updateStep` method to save state before attempting Discord API calls
  - Ensure state consistency even when Discord API calls fail
  - Add state validation before saving to prevent corruption
  - _Requirements: 4.1, 4.2_

- [x] 6. Create comprehensive unit tests for the fixes
  - Write tests for `updateStep` method that verify state loading occurs
  - Create tests for retry logic in Discord API calls
  - Add tests for error handling scenarios in state management
  - Test unified storage initialization across entry points
  - _Requirements: 1.1, 2.2, 3.3_

- [x] 7. Add integration tests for end-to-end pipeline flow
  - Create test that simulates complete pipeline from init through multiple step updates to completion
  - Test state persistence across multiple `updateStep` calls
  - Verify Discord embed updates reflect correct state after each step
  - Test error recovery scenarios
  - _Requirements: 1.2, 4.3, 4.4_

- [x] 8. Add state validation and backup mechanisms
  - Implement state validation method in FileStorage class
  - Add backup creation before state modifications
  - Create recovery mechanism for corrupted state files
  - Add checksum validation for state integrity
  - _Requirements: 2.3, 4.4_