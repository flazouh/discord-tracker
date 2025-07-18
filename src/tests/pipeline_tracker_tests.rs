use crate::error::TrackerError;
use crate::pipeline_tracker::PipelineTracker;

#[test]
fn test_pipeline_tracker_new() {
    let result = PipelineTracker::new("valid_token", "1234567890123456789");
    assert!(result.is_ok());
}

#[test]
fn test_pipeline_tracker_new_invalid_token() {
    let result = PipelineTracker::new("", "1234567890123456789");
    assert!(matches!(result, Err(TrackerError::InvalidBotToken)));
}

#[test]
fn test_pipeline_tracker_new_invalid_channel_id() {
    let result = PipelineTracker::new("valid_token", "invalid_channel");
    assert!(matches!(result, Err(TrackerError::InvalidChannelId(_))));
} 