use clap::{Parser, Subcommand};
use tracing::{error, info, Level};
use tracing_subscriber::FmtSubscriber;

use discord_tracker::pipeline_tracker::PipelineTracker;
use discord_tracker::error::TrackerError;

#[derive(Parser)]
#[command(
    name = "discord-tracker",
    about = "Production Discord pipeline tracker for CI/CD workflows",
    version,
    author
)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Initialize a new pipeline tracker
    Init {
        /// Pull request number
        #[arg(long)]
        pr_number: String,
        /// Pull request title
        #[arg(long)]
        pr_title: String,
        /// PR author username
        #[arg(long)]
        author: String,
        /// Repository name (e.g., "owner/repo")
        #[arg(long)]
        repository: String,
        /// Branch name
        #[arg(long)]
        branch: String,
    },
    /// Update step progress
    Step {
        /// Current step number (1-based)
        #[arg(long)]
        step_number: u32,
        /// Total number of steps
        #[arg(long)]
        total_steps: u32,
        /// Name of the current step
        #[arg(long)]
        step_name: String,
        /// Step status (success, pending, failed)
        #[arg(long)]
        status: String,
        /// Additional information as key-value pairs
        #[arg(long, value_delimiter = ',')]
        additional_info: Vec<String>,
    },
    /// Complete the pipeline
    Complete,
    /// Handle pipeline failure
    Fail {
        /// Name of the step that failed
        #[arg(long)]
        step_name: String,
        /// Error message
        #[arg(long)]
        error_message: String,
    },
}

#[tokio::main]
async fn main() -> Result<(), TrackerError> {
    // Initialize logging
    let _subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .with_target(false)
        .with_thread_ids(false)
        .with_thread_names(false)
        .init();

    info!("Starting Discord Tracker");

    let cli = Cli::parse();

    // Get environment variables
    let bot_token = std::env::var("DISCORD_BOT_TOKEN")
        .map_err(|_| TrackerError::MissingEnvironmentVariable("DISCORD_BOT_TOKEN".to_string()))?;
    let channel_id = std::env::var("DISCORD_CHANNEL_ID")
        .map_err(|_| TrackerError::MissingEnvironmentVariable("DISCORD_CHANNEL_ID".to_string()))?;

    // Create pipeline tracker
    let mut tracker = PipelineTracker::new(&bot_token, &channel_id)?;

    match cli.command {
        Commands::Init {
            pr_number,
            pr_title,
            author,
            repository,
            branch,
        } => {
            info!("Initializing pipeline tracker for PR #{}", pr_number);
            tracker
                .init_pipeline(&pr_number, &pr_title, &author, &repository, &branch)
                .await?;
            info!("Pipeline tracker initialized successfully");
        }
        Commands::Step {
            step_number,
            total_steps,
            step_name,
            status,
            additional_info,
        } => {
            info!("Updating step {}: {}", step_number, step_name);
            let additional_info_pairs: Vec<(String, String)> = additional_info
                .chunks(2)
                .filter_map(|chunk| {
                    if chunk.len() == 2 {
                        Some((chunk[0].clone(), chunk[1].clone()))
                    } else {
                        None
                    }
                })
                .collect();
            tracker
                .update_step(step_number, total_steps, &step_name, &status, &additional_info_pairs)
                .await?;
            info!("Step updated successfully");
        }
        Commands::Complete => {
            info!("Completing pipeline");
            tracker.complete_pipeline().await?;
            info!("Pipeline completed successfully");
        }
        Commands::Fail {
            step_name,
            error_message,
        } => {
            error!("Pipeline failed at step: {}", step_name);
            tracker
                .update_step(1, 1, &step_name, "failed", &[("error".to_string(), error_message)])
                .await?;
            info!("Pipeline failure recorded");
        }
    }

    Ok(())
} 