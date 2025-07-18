use crate::error::TrackerError;

/// Validates Discord bot token
pub fn validate_bot_token(token: &str) -> Result<(), TrackerError> {
    if token.is_empty() {
        return Err(TrackerError::InvalidBotToken);
    }
    Ok(())
}

/// Validates Discord channel ID, handling both regular integers and scientific notation
pub fn validate_channel_id(channel_id: &str) -> Result<(), TrackerError> {
    if channel_id.is_empty() {
        return Err(TrackerError::InvalidChannelId(channel_id.to_string()));
    }
    
    // Handle scientific notation (e.g., "1.39589530256487E+18")
    if channel_id.contains('E') || channel_id.contains('e') {
        match channel_id.parse::<f64>() {
            Ok(_) => return Ok(()),
            Err(_) => return Err(TrackerError::InvalidChannelId(channel_id.to_string())),
        }
    }
    
    // Handle regular numeric strings
    if !channel_id.chars().all(char::is_numeric) {
        return Err(TrackerError::InvalidChannelId(channel_id.to_string()));
    }
    
    Ok(())
}

/// Validates step number
pub fn validate_step_number(step: u32, total_steps: u32) -> Result<(), TrackerError> {
    if step == 0 {
        return Err(TrackerError::InvalidStepNumber(step));
    }
    if total_steps == 0 {
        return Err(TrackerError::InvalidTotalSteps(total_steps));
    }
    if step > total_steps {
        return Err(TrackerError::StepNumberExceedsTotal(step, total_steps));
    }
    Ok(())
} 