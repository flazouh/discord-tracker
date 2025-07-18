use crate::error::TrackerError;
use crate::discord_api::DiscordApi;

#[test]
fn test_discord_api_new_valid() {
    let result = DiscordApi::new("valid_token", "1234567890123456789");
    assert!(result.is_ok());
}

#[test]
fn test_discord_api_new_invalid_token() {
    let result = DiscordApi::new("", "1234567890123456789");
    assert!(matches!(result, Err(TrackerError::InvalidBotToken)));
}

#[test]
fn test_discord_api_new_invalid_channel_id() {
    let result = DiscordApi::new("valid_token", "invalid_channel");
    assert!(matches!(result, Err(TrackerError::InvalidChannelId(_))));
}

#[test]
fn test_discord_api_new_scientific_notation_channel_id() {
    let result = DiscordApi::new("valid_token", "1.39589530256487E+18");
    assert!(result.is_ok());
} 