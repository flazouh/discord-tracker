use crate::error::TrackerError;
use crate::validation::{validate_bot_token, validate_channel_id, validate_step_number};

#[test]
fn test_validate_bot_token() {
    // Valid token
    assert!(validate_bot_token("valid_token").is_ok());
    
    // Empty token
    assert!(matches!(
        validate_bot_token(""),
        Err(TrackerError::InvalidBotToken)
    ));
}

#[test]
fn test_validate_channel_id() {
    // Valid regular integer
    assert!(validate_channel_id("1234567890123456789").is_ok());
    
    // Valid scientific notation
    assert!(validate_channel_id("1.39589530256487E+18").is_ok());
    assert!(validate_channel_id("1.39589530256487e+18").is_ok());
    
    // Invalid: empty
    assert!(matches!(
        validate_channel_id(""),
        Err(TrackerError::InvalidChannelId(_))
    ));
    
    // Invalid: contains letters
    assert!(matches!(
        validate_channel_id("123abc456"),
        Err(TrackerError::InvalidChannelId(_))
    ));
    
    // Invalid: invalid scientific notation
    assert!(matches!(
        validate_channel_id("1.2E+invalid"),
        Err(TrackerError::InvalidChannelId(_))
    ));
}

#[test]
fn test_validate_step_number() {
    // Valid step numbers
    assert!(validate_step_number(1, 10).is_ok());
    assert!(validate_step_number(5, 10).is_ok());
    assert!(validate_step_number(10, 10).is_ok());
    
    // Invalid: zero step
    assert!(matches!(
        validate_step_number(0, 10),
        Err(TrackerError::InvalidStepNumber(0))
    ));
    
    // Invalid: zero total steps
    assert!(matches!(
        validate_step_number(1, 0),
        Err(TrackerError::InvalidTotalSteps(0))
    ));
    
    // Invalid: step exceeds total
    assert!(matches!(
        validate_step_number(11, 10),
        Err(TrackerError::StepNumberExceedsTotal(11, 10))
    ));
} 