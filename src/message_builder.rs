use chrono::{Utc, DateTime};
use crate::models::{DiscordEmbed, DiscordField, DiscordFooter, StepInfo, StepStatus};

/// Builds Discord embed for pipeline initialization
pub fn build_init_embed(pr_number: &str, pr_title: &str, author: &str, repository: &str, branch: &str) -> DiscordEmbed {
    DiscordEmbed {
        title: format!("🚀 Pipeline Started - PR #{}", pr_number),
        description: format!("**{}**\n\n**Author:** {}\n**Repository:** {}\n**Branch:** {}", 
            pr_title, author, repository, branch),
        color: 0x00ff00, // Green
        fields: vec![
            DiscordField {
                name: "Status".to_string(),
                value: "🔄 Initializing...".to_string(),
                inline: true,
            },
            DiscordField {
                name: "Progress".to_string(),
                value: "0/0 steps completed".to_string(),
                inline: true,
            },
        ],
        footer: Some(DiscordFooter {
            text: format!("Started at {}", Utc::now().format("%Y-%m-%d %H:%M:%S UTC")),
        }),
        timestamp: Utc::now(),
    }
}

/// Builds Discord embed for step updates
pub fn build_step_update_embed(
    pr_number: &str,
    pr_title: &str,
    steps: &[StepInfo],
    current_step: u32,
    total_steps: u32,
) -> DiscordEmbed {
    let completed_steps = steps.iter().filter(|s| s.status == StepStatus::Success).count();
    let failed_steps = steps.iter().filter(|s| s.status == StepStatus::Failed).count();
    let _pending_steps = steps.iter().filter(|s| s.status == StepStatus::Pending).count();
    
    let progress_percentage = if total_steps > 0 {
        (completed_steps as f64 / total_steps as f64 * 100.0) as u32
    } else {
        0
    };
    
    let status_emoji = if failed_steps > 0 {
        "❌"
    } else if completed_steps == total_steps as usize {
        "✅"
    } else {
        "🔄"
    };
    
    let status_text = if failed_steps > 0 {
        "Failed"
    } else if completed_steps == total_steps as usize {
        "Completed"
    } else {
        "In Progress"
    };
    
    DiscordEmbed {
        title: format!("{} Pipeline Update - PR #{}", status_emoji, pr_number),
        description: format!("**{}**", pr_title),
        color: get_status_color(failed_steps, completed_steps, total_steps),
        fields: vec![
            DiscordField {
                name: "Status".to_string(),
                value: format!("{} {}", status_emoji, status_text),
                inline: true,
            },
            DiscordField {
                name: "Progress".to_string(),
                value: format!("{}/{} steps completed ({}%)", completed_steps, total_steps, progress_percentage),
                inline: true,
            },
            DiscordField {
                name: "Current Step".to_string(),
                value: format!("Step {} of {}", current_step, total_steps),
                inline: true,
            },
        ],
        footer: Some(DiscordFooter {
            text: format!("Updated at {}", Utc::now().format("%Y-%m-%d %H:%M:%S UTC")),
        }),
        timestamp: Utc::now(),
    }
}

/// Builds Discord embed for pipeline completion
pub fn build_completion_embed(
    pr_number: &str,
    pr_title: &str,
    steps: &[StepInfo],
    total_steps: u32,
    start_time: DateTime<Utc>,
) -> DiscordEmbed {
    let completed_steps = steps.iter().filter(|s| s.status == StepStatus::Success).count();
    let failed_steps = steps.iter().filter(|s| s.status == StepStatus::Failed).count();
    let duration = Utc::now() - start_time;
    
    let status_emoji = if failed_steps > 0 { "❌" } else { "✅" };
    let status_text = if failed_steps > 0 { "Failed" } else { "Completed" };
    
    DiscordEmbed {
        title: format!("{} Pipeline {} - PR #{}", status_emoji, status_text, pr_number),
        description: format!("**{}**\n\n**Duration:** {}\n**Steps:** {}/{} completed", 
            pr_title, format_duration(duration), completed_steps, total_steps),
        color: get_status_color(failed_steps, completed_steps, total_steps),
        fields: vec![
            DiscordField {
                name: "Status".to_string(),
                value: format!("{} {}", status_emoji, status_text),
                inline: true,
            },
            DiscordField {
                name: "Duration".to_string(),
                value: format_duration(duration),
                inline: true,
            },
        ],
        footer: Some(DiscordFooter {
            text: format!("Completed at {}", Utc::now().format("%Y-%m-%d %H:%M:%S UTC")),
        }),
        timestamp: Utc::now(),
    }
}

/// Gets color based on pipeline status
fn get_status_color(failed_steps: usize, completed_steps: usize, total_steps: u32) -> u32 {
    if failed_steps > 0 {
        0xff0000 // Red for failure
    } else if completed_steps == total_steps as usize {
        0x00ff00 // Green for success
    } else {
        0xffff00 // Yellow for in progress
    }
}

/// Formats duration in a human-readable format
fn format_duration(duration: chrono::Duration) -> String {
    let minutes = duration.num_minutes();
    let seconds = duration.num_seconds() % 60;
    
    if minutes > 0 {
        format!("{}m {}s", minutes, seconds)
    } else {
        format!("{}s", seconds)
    }
} 