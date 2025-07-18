use chrono::Utc;
use crate::models::{StepInfo, StepStatus};
use crate::message_builder::{build_init_embed, build_step_update_embed, build_completion_embed};

#[test]
fn test_build_init_embed() {
    let embed = build_init_embed("123", "Test PR", "testuser", "test/repo", "main");
    
    assert!(embed.title.contains("🚀 Pipeline Started - PR #123"));
    assert!(embed.description.contains("Test PR"));
    assert!(embed.description.contains("testuser"));
    assert!(embed.description.contains("test/repo"));
    assert!(embed.description.contains("main"));
    assert_eq!(embed.color, 0x00ff00); // Green
    assert_eq!(embed.fields.len(), 2);
    assert!(embed.fields[0].name == "Status");
    assert!(embed.fields[1].name == "Progress");
}

#[test]
fn test_build_step_update_embed() {
    let steps = vec![
        StepInfo::new(1, "Step 1".to_string(), StepStatus::Success, vec![]),
        StepInfo::new(2, "Step 2".to_string(), StepStatus::Pending, vec![]),
    ];
    
    let embed = build_step_update_embed("123", "Test PR", &steps, 2, 3);
    
    assert!(embed.title.contains("🔄 Pipeline Update - PR #123"));
    assert!(embed.description.contains("Test PR"));
    assert_eq!(embed.fields.len(), 3);
    assert!(embed.fields[0].name == "Status");
    assert!(embed.fields[1].name == "Progress");
    assert!(embed.fields[2].name == "Current Step");
}

#[test]
fn test_build_completion_embed() {
    let steps = vec![
        StepInfo::new(1, "Step 1".to_string(), StepStatus::Success, vec![]),
        StepInfo::new(2, "Step 2".to_string(), StepStatus::Success, vec![]),
    ];
    
    let start_time = Utc::now();
    let embed = build_completion_embed("123", "Test PR", &steps, 2, start_time);
    
    assert!(embed.title.contains("✅ Pipeline Completed - PR #123"));
    assert!(embed.description.contains("Test PR"));
    assert_eq!(embed.fields.len(), 2);
    assert!(embed.fields[0].name == "Status");
    assert!(embed.fields[1].name == "Duration");
} 