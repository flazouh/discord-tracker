use reqwest::Client;
use crate::error::TrackerError;
use crate::models::{DiscordMessage, DiscordMessageResponse, DiscordErrorResponse};
use crate::validation::{validate_bot_token, validate_channel_id};

/// Discord API client for sending messages
pub struct DiscordApi {
    client: Client,
    bot_token: String,
    channel_id: String,
}

impl DiscordApi {
    /// Creates a new Discord API client
    pub fn new(bot_token: &str, channel_id: &str) -> Result<Self, TrackerError> {
        validate_bot_token(bot_token)?;
        validate_channel_id(channel_id)?;
        
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|e| TrackerError::HttpError(e.into()))?;
        
        Ok(Self {
            client,
            bot_token: bot_token.to_string(),
            channel_id: channel_id.to_string(),
        })
    }
    
    /// Sends a message to Discord
    pub async fn send_message(&self, message: &DiscordMessage) -> Result<String, TrackerError> {
        let url = format!(
            "https://discord.com/api/v10/channels/{}/messages",
            self.channel_id
        );
        
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bot {}", self.bot_token))
            .header("Content-Type", "application/json")
            .json(message)
            .send()
            .await
            .map_err(|e| TrackerError::HttpError(e.into()))?;
        
        let status = response.status();
        if status.is_success() {
            let message_response: DiscordMessageResponse = response
                .json()
                .await
                .map_err(|e| TrackerError::HttpError(e.into()))?;
            Ok(message_response.id)
        } else {
            let error_response: DiscordErrorResponse = response
                .json()
                .await
                .unwrap_or_else(|_| DiscordErrorResponse {
                    code: None,
                    message: "Unknown error".to_string(),
                });
            Err(TrackerError::DiscordApiError(format!(
                "{}: {}",
                status,
                error_response.message
            )))
        }
    }
    
    /// Updates an existing message
    pub async fn update_message(&self, message_id: &str, message: &DiscordMessage) -> Result<(), TrackerError> {
        let url = format!(
            "https://discord.com/api/v10/channels/{}/messages/{}",
            self.channel_id, message_id
        );
        
        let response = self.client
            .patch(&url)
            .header("Authorization", format!("Bot {}", self.bot_token))
            .header("Content-Type", "application/json")
            .json(message)
            .send()
            .await
            .map_err(|e| TrackerError::HttpError(e.into()))?;
        
        let status = response.status();
        if status.is_success() {
            Ok(())
        } else {
            let error_response: DiscordErrorResponse = response
                .json()
                .await
                .unwrap_or_else(|_| DiscordErrorResponse {
                    code: None,
                    message: "Unknown error".to_string(),
                });
            Err(TrackerError::DiscordApiError(format!(
                "{}: {}",
                status,
                error_response.message
            )))
        }
    }
    
    /// Deletes a message
    pub async fn delete_message(&self, message_id: &str) -> Result<(), TrackerError> {
        let url = format!(
            "https://discord.com/api/v10/channels/{}/messages/{}",
            self.channel_id, message_id
        );
        
        let response = self.client
            .delete(&url)
            .header("Authorization", format!("Bot {}", self.bot_token))
            .send()
            .await
            .map_err(|e| TrackerError::HttpError(e.into()))?;
        
        let status = response.status();
        if status.is_success() {
            Ok(())
        } else {
            let error_response: DiscordErrorResponse = response
                .json()
                .await
                .unwrap_or_else(|_| DiscordErrorResponse {
                    code: None,
                    message: "Unknown error".to_string(),
                });
            Err(TrackerError::DiscordApiError(format!(
                "{}: {}",
                status,
                error_response.message
            )))
        }
    }
} 