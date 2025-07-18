use thiserror::Error;

#[derive(Error, Debug)]
pub enum TrackerError {
    #[error("Missing environment variable: {0}")]
    MissingEnvironmentVariable(String),

    #[error("Discord API error: {0}")]
    DiscordApiError(String),

    #[error("HTTP request failed: {0}")]
    HttpError(#[from] reqwest::Error),

    #[error("JSON serialization error: {0}")]
    JsonError(#[from] serde_json::Error),

    #[error("File system error: {0}")]
    FileSystemError(#[from] std::io::Error),

    #[error("Invalid status: {0}. Must be one of: success, pending, failed")]
    InvalidStatus(String),

    #[error("Invalid step number: {0}. Must be greater than 0")]
    InvalidStepNumber(u32),

    #[error("Invalid total steps: {0}. Must be greater than 0")]
    InvalidTotalSteps(u32),

    #[error("Step number ({0}) cannot be greater than total steps ({1})")]
    StepNumberExceedsTotal(u32, u32),

    #[error("Message ID not found. Run init command first")]
    MessageIdNotFound,

    #[error("Channel ID is invalid: {0}")]
    InvalidChannelId(String),

    #[error("Bot token is invalid")]
    InvalidBotToken,

    #[error("Rate limited by Discord API. Retry after: {0} seconds")]
    RateLimited(u64),

    #[error("Unauthorized. Check bot token and permissions")]
    Unauthorized,

    #[error("Forbidden. Bot lacks required permissions")]
    Forbidden,

    #[error("Message not found. It may have been deleted")]
    MessageNotFound,

    #[error("Unknown Discord API error: {0}")]
    UnknownDiscordError(String),
} 