use crate::error::TrackerError;
use crate::pipeline_tracker::PipelineTracker;

#[test]
fn test_validation_integration() {
    // Test that validation works across all modules
    let result = PipelineTracker::new("valid_token", "1.39589530256487E+18");
    assert!(result.is_ok());
}

#[test]
fn test_error_propagation() {
    // Test that errors propagate correctly through the system
    let result = PipelineTracker::new("", "1.39589530256487E+18");
    assert!(matches!(result, Err(TrackerError::InvalidBotToken)));
} 