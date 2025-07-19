# Design Document

## Overview

The Discord embed update issue is caused by a fundamental flaw in the state management architecture. The `updateStep` method doesn't load persisted state before making updates, causing it to work with stale in-memory data. Additionally, there are inconsistencies in how storage is initialized between different entry points.

## Root Cause Analysis

### Primary Issues Identified

1. **Missing State Loading in updateStep**: The `updateStep` method doesn't call `loadState()`, unlike `completePipeline()` which correctly loads state first
2. **Inconsistent Storage Initialization**: `main.ts` creates tracker without storage (defaults to InMemoryStorage), while `index.ts` uses FileStorage
3. **State Persistence Timing**: State is saved after Discord API calls, meaning failures leave the system in an inconsistent state
4. **No Retry Logic**: Failed Discord API calls don't retry, leaving embeds in stale states

### Secondary Issues

1. **Error Handling**: Limited error recovery mechanisms
2. **Concurrency**: No protection against concurrent state modifications
3. **State Validation**: No validation that loaded state is consistent

## Architecture

### Current Flow (Broken)
```
GitHub Action → main.ts → PipelineTracker (InMemoryStorage) → updateStep → Discord API
                                                           ↓
                                                    State not loaded from disk
```

### Proposed Flow (Fixed)
```
GitHub Action → Unified Entry Point → PipelineTracker (FileStorage) → updateStep → loadState → Discord API
                                                                                  ↓
                                                                            State persisted before API call
```

## Components and Interfaces

### 1. Enhanced PipelineTracker

**Changes Required:**
- Add `loadState()` call at the beginning of `updateStep()`
- Ensure all methods use FileStorage by default
- Add retry logic for Discord API calls
- Improve error handling and logging

**New Method Signatures:**
```typescript
async updateStep(
  stepNumber: number,
  totalSteps: number,
  stepName: string,
  status: string,
  additionalInfo: [string, string][],
  retryCount?: number
): Promise<void>
```

### 2. Unified Entry Point

**Purpose:** Consolidate `main.ts` and `index.ts` to use consistent storage initialization

**Implementation:**
- Create a factory function for PipelineTracker that always uses FileStorage
- Ensure both GitHub Action and direct usage paths use the same initialization
- Add environment-specific configuration handling

### 3. Enhanced Storage Interface

**Additions:**
- State validation methods
- Atomic write operations
- Backup/recovery mechanisms

**New Methods:**
```typescript
interface Storage {
  // Existing methods...
  validateState(state: InternalPipelineState): boolean;
  createBackup(): Promise<void>;
  restoreFromBackup(): Promise<InternalPipelineState | null>;
}
```

### 4. Retry Mechanism

**Implementation:**
- Exponential backoff for Discord API calls
- Maximum retry attempts (default: 3)
- Different retry strategies for different error types

## Data Models

### Enhanced Error Tracking

```typescript
interface RetryableError {
  originalError: Error;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: Date;
}

interface StateValidationResult {
  isValid: boolean;
  errors: string[];
  canRecover: boolean;
}
```

### State Consistency

```typescript
interface StateMetadata {
  version: string;
  lastUpdated: Date;
  checksum: string;
}
```

## Error Handling

### 1. State Loading Failures
- **Scenario**: State file is corrupted or missing
- **Response**: Log warning, continue with empty state, attempt to recover from Discord message history
- **Fallback**: Create new pipeline state if recovery fails

### 2. Discord API Failures
- **Scenario**: Network issues, rate limiting, invalid tokens
- **Response**: Retry with exponential backoff, preserve local state
- **Fallback**: Log detailed error, continue operation without Discord updates

### 3. Storage Failures
- **Scenario**: Disk full, permission issues, file system errors
- **Response**: Switch to in-memory storage temporarily, log critical error
- **Fallback**: Continue operation with reduced functionality

### 4. Concurrent Access
- **Scenario**: Multiple processes trying to update state simultaneously
- **Response**: File locking mechanism, atomic writes
- **Fallback**: Queue operations, process sequentially

## Testing Strategy

### 1. Unit Tests
- **State Loading**: Verify `updateStep` loads state correctly
- **Error Handling**: Test all error scenarios with appropriate responses
- **Retry Logic**: Validate exponential backoff and retry limits
- **Storage Operations**: Test atomic writes and state validation

### 2. Integration Tests
- **End-to-End Flow**: Test complete pipeline from init to completion
- **State Persistence**: Verify state survives process restarts
- **Discord Integration**: Mock Discord API to test update flows
- **Error Recovery**: Test recovery from various failure scenarios

### 3. Performance Tests
- **Concurrent Updates**: Test multiple simultaneous step updates
- **Large State Files**: Test with pipelines having many steps
- **Network Latency**: Test Discord API calls under poor network conditions

### 4. Regression Tests
- **Backward Compatibility**: Ensure existing state files still work
- **API Compatibility**: Verify no breaking changes to public interfaces
- **GitHub Actions**: Test in actual GitHub Actions environment

## Implementation Phases

### Phase 1: Critical Fixes
1. Add `loadState()` call to `updateStep()` method
2. Unify storage initialization across entry points
3. Add basic retry logic for Discord API calls

### Phase 2: Enhanced Error Handling
1. Implement comprehensive error recovery
2. Add state validation and backup mechanisms
3. Improve logging and debugging information

### Phase 3: Performance and Reliability
1. Add concurrency protection
2. Implement performance optimizations
3. Add comprehensive monitoring and metrics

## Backward Compatibility

- Existing state files will continue to work without modification
- Public API remains unchanged
- Configuration options are additive only
- Legacy storage formats are automatically migrated