use std::env;
use std::fs::write;
use std::process::exit;
use tracing::{error, info, Level};
use tracing_subscriber::FmtSubscriber;

use discord_tracker_action::pipeline_tracker::PipelineTracker;
use discord_tracker_action::error::TrackerError;

#[tokio::main]
async fn main() -> Result<(), TrackerError> {
    // Initialize logging
    let _subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .with_target(false)
        .with_thread_ids(false)
        .with_thread_names(false)
        .init();

    info!("Starting Discord Tracker GitHub Action");

    // Get GitHub output path
    let github_output_path = env::var("GITHUB_OUTPUT")
        .map_err(|_| TrackerError::MissingEnvironmentVariable("GITHUB_OUTPUT".to_string()))?;

    // Get action arguments from command line
    let args: Vec<String> = env::args().collect();
    if args.len() < 14 {
        let error_msg = "Insufficient arguments provided";
        eprintln!("Error: {}", error_msg);
        write(github_output_path, format!("error={}\nsuccess=false", error_msg)).unwrap();
        exit(1);
    }

    let action = &args[1];
    let pr_number = &args[2];
    let pr_title = &args[3];
    let author = &args[4];
    let repository = &args[5];
    let branch = &args[6];
    let step_number = &args[7];
    let total_steps = &args[8];
    let step_name = &args[9];
    let status = &args[10];
    let additional_info = &args[11];
    let error_message = &args[12];
    let bot_token = &args[13];
    let channel_id = &args[14];

    // Create pipeline tracker
    let mut tracker = match PipelineTracker::new(bot_token, channel_id) {
        Ok(tracker) => tracker,
        Err(e) => {
            let error_msg = format!("Failed to create pipeline tracker: {}", e);
            eprintln!("Error: {}", error_msg);
            write(github_output_path, format!("error={}\nsuccess=false", error_msg)).unwrap();
            exit(1);
        }
    };

    // Execute the requested action
    let result = match action.as_str() {
        "init" => {
            if pr_number.is_empty() || pr_title.is_empty() || author.is_empty() || repository.is_empty() || branch.is_empty() {
                let error_msg = "Missing required parameters for init action";
                eprintln!("Error: {}", error_msg);
                write(github_output_path, format!("error={}\nsuccess=false", error_msg)).unwrap();
                exit(1);
            }
            info!("Initializing pipeline tracker for PR #{}", pr_number);
            tracker.init_pipeline(pr_number, pr_title, author, repository, branch).await
        }
        "step" => {
            if step_number.is_empty() || total_steps.is_empty() || step_name.is_empty() || status.is_empty() {
                let error_msg = "Missing required parameters for step action";
                eprintln!("Error: {}", error_msg);
                write(github_output_path, format!("error={}\nsuccess=false", error_msg)).unwrap();
                exit(1);
            }
            let step_num = step_number.parse::<u32>().unwrap_or(1);
            let total = total_steps.parse::<u32>().unwrap_or(1);
            
            let additional_info_pairs: Vec<(String, String)> = if !additional_info.is_empty() {
                match serde_json::from_str::<serde_json::Map<String, serde_json::Value>>(additional_info) {
                    Ok(map) => map.into_iter()
                        .map(|(k, v)| (k, v.to_string()))
                        .collect(),
                    Err(_) => vec![]
                }
            } else {
                vec![]
            };
            
            info!("Updating step {}: {}", step_num, step_name);
            tracker.update_step(step_num, total, step_name, status, &additional_info_pairs).await
        }
        "complete" => {
            info!("Completing pipeline");
            tracker.complete_pipeline().await
        }
        "fail" => {
            if step_name.is_empty() || error_message.is_empty() {
                let error_msg = "Missing required parameters for fail action";
                eprintln!("Error: {}", error_msg);
                write(github_output_path, format!("error={}\nsuccess=false", error_msg)).unwrap();
                exit(1);
            }
            error!("Pipeline failed at step: {}", step_name);
            tracker.update_step(1, 1, step_name, "failed", &[("error".to_string(), error_message.to_string())]).await
        }
        _ => {
            let error_msg = format!("Invalid action: {}", action);
            eprintln!("Error: {}", error_msg);
            write(github_output_path, format!("error={}\nsuccess=false", error_msg)).unwrap();
            exit(1);
        }
    };

    match result {
        Ok(_) => {
            info!("Action completed successfully");
            write(github_output_path, "success=true").unwrap();
            Ok(())
        }
        Err(e) => {
            let error_msg = format!("Action failed: {}", e);
            eprintln!("Error: {}", error_msg);
            write(github_output_path, format!("error={}\nsuccess=false", error_msg)).unwrap();
            exit(1);
        }
    }
} 