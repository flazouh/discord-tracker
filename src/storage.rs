use std::path::PathBuf;
use tokio::fs;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use crate::error::TrackerError;
use crate::models::StepInfo;

#[derive(Debug, Serialize, Deserialize)]
pub struct PipelineState {
    pub message_id: String,
    pub pr_number: u32,
    pub pr_title: String,
    pub author: String,
    pub repository: String,
    pub branch: String,
    pub steps: Vec<StepInfo>,
    pub pipeline_started_at: DateTime<Utc>,
}

#[derive(Debug)]
pub struct MessageStorage {
    file_path: PathBuf,
}

impl MessageStorage {
    pub fn new() -> Result<Self, TrackerError> {
        let current_dir = std::env::current_dir()?;
        let file_path = current_dir.join(".discord-pipeline-state");
        
        Ok(Self { file_path })
    }

    pub async fn save_pipeline_state(&self, state: &PipelineState) -> Result<(), TrackerError> {
        let json = serde_json::to_string_pretty(state)?;
        fs::write(&self.file_path, json).await?;
        Ok(())
    }

    pub async fn load_pipeline_state(&self) -> Result<Option<PipelineState>, TrackerError> {
        if !self.file_path.exists() {
            return Ok(None);
        }

        let content = fs::read_to_string(&self.file_path).await?;
        if content.trim().is_empty() {
            return Ok(None);
        }

        let state: PipelineState = serde_json::from_str(&content)?;
        Ok(Some(state))
    }

    pub async fn clear_pipeline_state(&self) -> Result<(), TrackerError> {
        if self.file_path.exists() {
            fs::remove_file(&self.file_path).await?;
        }
        Ok(())
    }

    // Legacy methods for backward compatibility
    pub async fn save_message_id(&self, message_id: &str) -> Result<(), TrackerError> {
        // Try to load existing state or create new one
        let mut state = self.load_pipeline_state().await?.unwrap_or_else(|| PipelineState {
            message_id: message_id.to_string(),
            pr_number: 0,
            pr_title: "Unknown".to_string(),
            author: "Unknown".to_string(),
            repository: "Unknown".to_string(),
            branch: "Unknown".to_string(),
            steps: Vec::new(),
            pipeline_started_at: Utc::now(),
        });
        
        state.message_id = message_id.to_string();
        self.save_pipeline_state(&state).await
    }

    pub async fn load_message_id(&self) -> Result<Option<String>, TrackerError> {
        if let Some(state) = self.load_pipeline_state().await? {
            Ok(Some(state.message_id))
        } else {
            Ok(None)
        }
    }

    pub async fn clear_message_id(&self) -> Result<(), TrackerError> {
        self.clear_pipeline_state().await
    }

    pub fn get_file_path(&self) -> &PathBuf {
        &self.file_path
    }
} 