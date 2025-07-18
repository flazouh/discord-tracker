use chrono::{Utc, DateTime};
use crate::error::TrackerError;
use crate::models::{DiscordMessage, StepInfo, StepStatus};
use crate::storage::{MessageStorage, PipelineState};
use crate::message_builder::{build_init_embed, build_step_update_embed, build_completion_embed};
use crate::discord_api::DiscordApi;
use crate::validation::validate_step_number;

/// Main pipeline tracker that orchestrates Discord notifications
pub struct PipelineTracker {
    api: DiscordApi,
    storage: MessageStorage,
    message_id: Option<String>,
    steps: Vec<StepInfo>,
    pr_info: Option<PrInfo>,
    pipeline_started_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone)]
struct PrInfo {
    number: String,
    title: String,
    author: String,
    repository: String,
    branch: String,
}

impl PipelineTracker {
    /// Creates a new pipeline tracker
    pub fn new(bot_token: &str, channel_id: &str) -> Result<Self, TrackerError> {
        let api = DiscordApi::new(bot_token, channel_id)?;
        let storage = MessageStorage::new()?;
        
        Ok(Self {
            api,
            storage,
            message_id: None,
            steps: Vec::new(),
            pr_info: None,
            pipeline_started_at: None,
        })
    }
    
    /// Initializes the pipeline tracking
    pub async fn init_pipeline(
        &mut self,
        pr_number: &str,
        pr_title: &str,
        author: &str,
        repository: &str,
        branch: &str,
    ) -> Result<(), TrackerError> {
        self.pr_info = Some(PrInfo {
            number: pr_number.to_string(),
            title: pr_title.to_string(),
            author: author.to_string(),
            repository: repository.to_string(),
            branch: branch.to_string(),
        });
        
        self.pipeline_started_at = Some(Utc::now());
        
        let embed = build_init_embed(pr_number, pr_title, author, repository, branch);
        let message = DiscordMessage {
            content: None,
            embeds: vec![embed],
        };
        
        let message_id = self.api.send_message(&message).await?;
        self.message_id = Some(message_id.clone());
        
        // Save state
        let state = PipelineState {
            message_id,
            pr_number: pr_number.parse().unwrap_or(0),
            pr_title: pr_title.to_string(),
            author: author.to_string(),
            repository: repository.to_string(),
            branch: branch.to_string(),
            steps: self.steps.clone(),
            pipeline_started_at: self.pipeline_started_at.unwrap(),
        };
        self.storage.save_pipeline_state(&state).await?;
        
        Ok(())
    }
    
    /// Updates a step in the pipeline
    pub async fn update_step(
        &mut self,
        step_number: u32,
        total_steps: u32,
        step_name: &str,
        status: &str,
        additional_info: &[(String, String)],
    ) -> Result<(), TrackerError> {
        validate_step_number(step_number, total_steps)?;
        
        let step_status = StepStatus::from_str(status)
            .map_err(|e| TrackerError::InvalidStatus(e))?;
        
        // Find or create step
        let step_index = self.steps.iter().position(|s| s.number == step_number);
        if let Some(index) = step_index {
            // Update existing step
            let step = &mut self.steps[index];
            step.name = step_name.to_string();
            step.status = step_status.clone();
            step.additional_info = additional_info.to_vec();
        } else {
            // Create new step
            let new_step = StepInfo::new(
                step_number,
                step_name.to_string(),
                step_status.clone(),
                additional_info.to_vec(),
            );
            self.steps.push(new_step);
        }
        
        // Mark step as completed if it's finished
        if step_status == StepStatus::Success || step_status == StepStatus::Failed {
            if let Some(index) = self.steps.iter().position(|s| s.number == step_number) {
                self.steps[index].mark_completed();
            }
        }
        
        // Update Discord message
        if let Some(pr_info) = &self.pr_info {
            let embed = build_step_update_embed(
                &pr_info.number,
                &pr_info.title,
                &self.steps,
                step_number,
                total_steps,
            );
            
            let message = DiscordMessage {
                content: None,
                embeds: vec![embed],
            };
            
            if let Some(message_id) = &self.message_id {
                self.api.update_message(message_id, &message).await?;
            }
        }
        
        // Save state
        if let Some(pr_info) = &self.pr_info {
            let state = PipelineState {
                message_id: self.message_id.clone().unwrap_or_default(),
                pr_number: pr_info.number.parse().unwrap_or(0),
                pr_title: pr_info.title.clone(),
                author: pr_info.author.clone(),
                repository: pr_info.repository.clone(),
                branch: pr_info.branch.clone(),
                steps: self.steps.clone(),
                pipeline_started_at: self.pipeline_started_at.unwrap_or_else(Utc::now),
            };
            self.storage.save_pipeline_state(&state).await?;
        }
        
        Ok(())
    }
    
    /// Completes the pipeline
    pub async fn complete_pipeline(&mut self) -> Result<(), TrackerError> {
        if let (Some(pr_info), Some(start_time)) = (&self.pr_info, self.pipeline_started_at) {
            let total_steps = self.steps.len() as u32;
            let embed = build_completion_embed(
                &pr_info.number,
                &pr_info.title,
                &self.steps,
                total_steps,
                start_time,
            );
            
            let message = DiscordMessage {
                content: None,
                embeds: vec![embed],
            };
            
            if let Some(message_id) = &self.message_id {
                self.api.update_message(message_id, &message).await?;
            }
        }
        
        // Clear state
        self.storage.clear_pipeline_state().await?;
        
        Ok(())
    }
} 