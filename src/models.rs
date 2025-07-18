use chrono::{DateTime, Utc, Duration};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct DiscordMessage {
    pub content: Option<String>,
    pub embeds: Vec<DiscordEmbed>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiscordEmbed {
    pub title: String,
    pub description: String,
    pub color: u32,
    pub fields: Vec<DiscordField>,
    pub timestamp: DateTime<Utc>,
    pub footer: Option<DiscordFooter>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiscordField {
    pub name: String,
    pub value: String,
    pub inline: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiscordFooter {
    pub text: String,
}

#[derive(Debug, Deserialize)]
pub struct DiscordMessageResponse {
    pub id: String,
    pub channel_id: String,
    pub content: String,
    pub embeds: Vec<DiscordEmbed>,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct DiscordErrorResponse {
    pub code: Option<u32>,
    pub message: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum StepStatus {
    Success,
    Pending,
    Failed,
}

impl StepStatus {
    pub fn from_str(s: &str) -> Result<Self, String> {
        match s.to_lowercase().as_str() {
            "success" => Ok(StepStatus::Success),
            "pending" => Ok(StepStatus::Pending),
            "failed" => Ok(StepStatus::Failed),
            _ => Err(format!("Invalid status: {}. Must be one of: success, pending, failed", s)),
        }
    }

    pub fn emoji(&self) -> &'static str {
        match self {
            StepStatus::Success => "✅",
            StepStatus::Pending => "⏳",
            StepStatus::Failed => "❌",
        }
    }

    pub fn color(&self) -> u32 {
        match self {
            StepStatus::Success => 0x57F287, // Discord green
            StepStatus::Pending => 0xFEE75C, // Discord yellow
            StepStatus::Failed => 0xED4245,  // Discord red
        }
    }
}

impl std::fmt::Display for StepStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            StepStatus::Success => write!(f, "success"),
            StepStatus::Pending => write!(f, "pending"),
            StepStatus::Failed => write!(f, "failed"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StepInfo {
    pub number: u32,
    pub name: String,
    pub status: StepStatus,
    pub additional_info: Vec<(String, String)>,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
}

impl StepInfo {
    pub fn new(number: u32, name: String, status: StepStatus, additional_info: Vec<(String, String)>) -> Self {
        Self {
            number,
            name,
            status,
            additional_info,
            started_at: Utc::now(),
            completed_at: None,
        }
    }

    pub fn mark_completed(&mut self) {
        self.completed_at = Some(Utc::now());
    }

    pub fn duration(&self) -> Option<Duration> {
        self.completed_at.map(|completed| completed - self.started_at)
    }

    pub fn format_duration(&self) -> String {
        if let Some(duration) = self.duration() {
            let millis = duration.num_milliseconds();
            if millis < 1000 {
                format!("(+{}ms)", millis)
            } else {
                let seconds = millis / 1000;
                let remaining_millis = millis % 1000;
                if remaining_millis == 0 {
                    format!("(+{}s)", seconds)
                } else {
                    format!("(+{}.{}s)", seconds, remaining_millis)
                }
            }
        } else {
            String::new()
        }
    }

    pub fn format_for_embed(&self) -> String {
        let mut parts = vec![format!("{}. {}", self.number, self.name)];
        
        // Add duration if completed
        let duration_str = self.format_duration();
        if !duration_str.is_empty() {
            parts.push(duration_str);
        }
        
        if !self.additional_info.is_empty() {
            let info_str = self
                .additional_info
                .iter()
                .map(|(k, v)| format!("{}:{}", k, v))
                .collect::<Vec<_>>()
                .join(", ");
            parts.push(format!(" - {}", info_str));
        }

        format!("{} {}", self.status.emoji(), parts.join(" "))
    }
} 