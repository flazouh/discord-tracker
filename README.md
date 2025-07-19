# Discord Pipeline Tracker GitHub Action

A production-ready GitHub Action that tracks CI/CD pipeline progress in Discord with real-time updates. This action provides seamless integration between your GitHub workflows and Discord channels, keeping your team informed about build status, deployment progress, and pipeline failures.

## Features

- 🚀 **Real-time Updates**: Send live updates to Discord as your pipeline progresses
- 🔄 **Step Tracking**: Track individual steps with progress indicators
- ✅ **Success/Failure Handling**: Automatic notifications for pipeline completion or failures
- 🎯 **PR Integration**: Link pipeline updates to specific pull requests
- 📊 **Rich Embeds**: Beautiful Discord embeds with progress bars and status indicators
- 🔒 **Secure**: Uses Discord bot tokens for secure communication

## Quick Start

### 1. Set up Discord Bot

1. Create a Discord application at [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a bot and copy the bot token
3. Invite the bot to your Discord server with appropriate permissions
4. Note the channel ID where you want to receive updates

### 2. Add Secrets to Your Repository

Go to your repository settings → Secrets and variables → Actions, and add:

- `DISCORD_BOT_TOKEN`: Your Discord bot token
- `DISCORD_CHANNEL_ID`: The Discord channel ID where updates should be sent

### 3. Use the Action in Your Workflow

```yaml
name: CI/CD Pipeline

on:
  pull_request:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      # Initialize pipeline tracking
      - name: Initialize Discord Tracker
        uses: flazouh/discord-tracker-action@v1
        with:
          action: 'init'
          pr_number: ${{ github.event.number }}
          pr_title: ${{ github.event.pull_request.title }}
          author: ${{ github.event.pull_request.user.login }}
          repository: ${{ github.repository }}
          branch: ${{ github.head_ref }}
          discord_bot_token: ${{ secrets.DISCORD_BOT_TOKEN }}
          discord_channel_id: ${{ secrets.DISCORD_CHANNEL_ID }}

      # Build step
      - name: Build Application
        run: |
          echo "Building application..."
          sleep 10  # Simulate build time
        continue-on-error: true

      - name: Update Build Step
        uses: flazouh/discord-tracker-action@v1
        if: always()
        with:
          action: 'step'
          step_number: '1'
          total_steps: '3'
          step_name: 'Build'
          status: ${{ job.status == 'success' && 'success' || 'failed' }}
          additional_info: '{"duration":"30s","artifacts":"build.zip"}'
          discord_bot_token: ${{ secrets.DISCORD_BOT_TOKEN }}
          discord_channel_id: ${{ secrets.DISCORD_CHANNEL_ID }}

      # Test step
      - name: Run Tests
        run: |
          echo "Running tests..."
          sleep 5  # Simulate test time

      - name: Update Test Step
        uses: flazouh/discord-tracker-action@v1
        with:
          action: 'step'
          step_number: '2'
          total_steps: '3'
          step_name: 'Tests'
          status: 'success'
          additional_info: '{"coverage":"85%","tests":"42 passed"}'
          discord_bot_token: ${{ secrets.DISCORD_BOT_TOKEN }}
          discord_channel_id: ${{ secrets.DISCORD_CHANNEL_ID }}

      # Deploy step
      - name: Deploy
        run: |
          echo "Deploying..."
          sleep 8  # Simulate deployment time

      - name: Update Deploy Step
        uses: flazouh/discord-tracker-action@v1
        with:
          action: 'step'
          step_number: '3'
          total_steps: '3'
          step_name: 'Deploy'
          status: 'success'
          additional_info: '{"environment":"production","url":"https://app.example.com"}'
          discord_bot_token: ${{ secrets.DISCORD_BOT_TOKEN }}
          discord_channel_id: ${{ secrets.DISCORD_CHANNEL_ID }}

      # Complete pipeline
      - name: Complete Pipeline
        uses: flazouh/discord-tracker-action@v1
        if: success()
        with:
          action: 'complete'
          discord_bot_token: ${{ secrets.DISCORD_BOT_TOKEN }}
          discord_channel_id: ${{ secrets.DISCORD_CHANNEL_ID }}

      # Handle failure
      - name: Handle Pipeline Failure
        uses: flazouh/discord-tracker-action@v1
        if: failure()
        with:
          action: 'fail'
          step_name: 'Pipeline'
          error_message: 'Pipeline failed during execution'
          discord_bot_token: ${{ secrets.DISCORD_BOT_TOKEN }}
          discord_channel_id: ${{ secrets.DISCORD_CHANNEL_ID }}
```

## Action Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `action` | The action to perform (`init`, `step`, `complete`, `fail`) | Yes | - |
| `pr_number` | Pull request number | No* | - |
| `pr_title` | Pull request title | No* | - |
| `author` | PR author username | No* | - |
| `repository` | Repository name (e.g., "owner/repo") | No* | - |
| `branch` | Branch name | No* | - |
| `step_number` | Current step number (1-based) | No* | - |
| `total_steps` | Total number of steps | No* | - |
| `step_name` | Name of the current step | No* | - |
| `status` | Step status (`success`, `pending`, `failed`) | No* | - |
| `additional_info` | Additional information as JSON string | No | - |
| `error_message` | Error message for failed steps | No* | - |
| `discord_bot_token` | Discord bot token | Yes | - |
| `discord_channel_id` | Discord channel ID | Yes | - |

*Required for specific actions (see Action Types below)

## Action Types

### `init` - Initialize Pipeline
Initializes a new pipeline tracker for a pull request.

**Required inputs:** `pr_number`, `pr_title`, `author`, `repository`, `branch`

```yaml
- uses: flazouh/discord-tracker-action@v1
  with:
    action: 'init'
    pr_number: '123'
    pr_title: 'Add new feature'
    author: 'username'
    repository: 'owner/repo'
    branch: 'feature/new-feature'
    discord_bot_token: ${{ secrets.DISCORD_BOT_TOKEN }}
    discord_channel_id: ${{ secrets.DISCORD_CHANNEL_ID }}
```

### `step` - Update Step Progress
Updates the progress of a specific pipeline step.

**Required inputs:** `step_number`, `total_steps`, `step_name`, `status`

```yaml
- uses: flazouh/discord-tracker-action@v1
  with:
    action: 'step'
    step_number: '1'
    total_steps: '3'
    step_name: 'Build'
    status: 'success'
    additional_info: '{"duration":"30s","coverage":"85%"}'
    discord_bot_token: ${{ secrets.DISCORD_BOT_TOKEN }}
    discord_channel_id: ${{ secrets.DISCORD_CHANNEL_ID }}
```

### `complete` - Complete Pipeline
Marks the pipeline as successfully completed.

```yaml
- uses: flazouh/discord-tracker-action@v1
  with:
    action: 'complete'
    discord_bot_token: ${{ secrets.DISCORD_BOT_TOKEN }}
    discord_channel_id: ${{ secrets.DISCORD_CHANNEL_ID }}
```

### `fail` - Handle Pipeline Failure
Marks the pipeline as failed with an error message.

**Required inputs:** `step_name`, `error_message`

```yaml
- uses: flazouh/discord-tracker-action@v1
  with:
    action: 'fail'
    step_name: 'Build'
    error_message: 'Build failed due to compilation errors'
    discord_bot_token: ${{ secrets.DISCORD_BOT_TOKEN }}
    discord_channel_id: ${{ secrets.DISCORD_CHANNEL_ID }}
```

## Action Outputs

| Output | Description |
|--------|-------------|
| `error` | The description of any error that occurred |
| `success` | Whether the action completed successfully (`true`/`false`) |

## Advanced Usage

### Conditional Updates
Use the action conditionally based on job status:

```yaml
- name: Update Step Status
  uses: flazouh/discord-tracker-action@v1
  if: always()  # Always run, even on failure
  with:
    action: 'step'
    step_number: '1'
    total_steps: '3'
    step_name: 'Build'
    status: ${{ job.status == 'success' && 'success' || 'failed' }}
    discord_bot_token: ${{ secrets.DISCORD_BOT_TOKEN }}
    discord_channel_id: ${{ secrets.DISCORD_CHANNEL_ID }}
```

### Rich Additional Information
Pass structured data as JSON for rich Discord embeds:

```yaml
- uses: flazouh/discord-tracker-action@v1
  with:
    action: 'step'
    step_number: '2'
    total_steps: '4'
    step_name: 'Tests'
    status: 'success'
    additional_info: '{"coverage":"92%","tests":"156 passed, 0 failed","duration":"2m 30s","artifacts":"test-results.xml"}'
    discord_bot_token: ${{ secrets.DISCORD_BOT_TOKEN }}
    discord_channel_id: ${{ secrets.DISCORD_CHANNEL_ID }}
```

### Multi-Environment Deployments
Track deployments across different environments:

```yaml
- name: Deploy to Staging
  run: echo "Deploying to staging..."
  
- name: Update Staging Deploy
  uses: flazouh/discord-tracker-action@v1
  with:
    action: 'step'
    step_number: '3'
    total_steps: '4'
    step_name: 'Deploy to Staging'
    status: 'success'
    additional_info: '{"environment":"staging","url":"https://staging.example.com","version":"1.2.3"}'
    discord_bot_token: ${{ secrets.DISCORD_BOT_TOKEN }}
    discord_channel_id: ${{ secrets.DISCORD_CHANNEL_ID }}

- name: Deploy to Production
  run: echo "Deploying to production..."
  
- name: Update Production Deploy
  uses: flazouh/discord-tracker-action@v1
  with:
    action: 'step'
    step_number: '4'
    total_steps: '4'
    step_name: 'Deploy to Production'
    status: 'success'
    additional_info: '{"environment":"production","url":"https://app.example.com","version":"1.2.3"}'
    discord_bot_token: ${{ secrets.DISCORD_BOT_TOKEN }}
    discord_channel_id: ${{ secrets.DISCORD_CHANNEL_ID }}
```

## Discord Bot Setup

### Required Permissions
Your Discord bot needs the following permissions:
- Send Messages
- Embed Links
- Use External Emojis
- Read Message History

### Bot Token Security
- Never commit your bot token to version control
- Use GitHub Secrets to store sensitive information
- Rotate your bot token regularly
- Use the minimum required permissions

## Troubleshooting

### Common Issues

1. **Action fails with "Missing required parameters"**
   - Ensure all required inputs are provided for the specific action type
   - Check that input names match exactly (case-sensitive)

2. **Discord messages not appearing**
   - Verify the bot token is correct
   - Ensure the bot has permissions in the target channel
   - Check that the channel ID is correct

3. **Action fails with "Invalid action"**
   - Use one of the supported action types: `init`, `step`, `complete`, `fail`
   - Check for typos in the action name

### Debug Mode
Enable debug logging by setting the `ACTIONS_STEP_DEBUG` secret to `true` in your repository.

## Development

### Local Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/flazouh/discord-tracker.git
   cd discord-tracker
   ```

2. Run the development setup script:
   ```bash
   ./scripts/dev-setup.sh
   ```

3. Test the action locally:
   ```bash
   docker run --rm -e GITHUB_OUTPUT=/tmp/output discord-tracker-action:local init 123 'Test PR' username owner/repo main 1 1 'Test' success '{}' 'error' YOUR_BOT_TOKEN YOUR_CHANNEL_ID
   ```

### Project Structure

```
discord-tracker/
├── action.yml                 # GitHub Action definition
├── Dockerfile                 # Docker container configuration
├── Cargo.toml                 # Rust dependencies and metadata
├── src/                       # Rust source code
│   ├── main.rs               # GitHub Action entry point
│   ├── lib.rs                # Library exports
│   ├── discord_api.rs        # Discord API client
│   ├── pipeline_tracker.rs   # Pipeline tracking logic
│   ├── message_builder.rs    # Discord embed builder
│   ├── models.rs             # Data structures
│   ├── error.rs              # Error handling
│   ├── storage.rs            # Message storage
│   └── validation.rs         # Input validation
├── .github/workflows/        # GitHub workflows
│   ├── docker-publish.yml    # Build and publish Docker image
│   ├── integration_tests.yml # Test the action
│   └── example.yml           # Example usage
└── scripts/                  # Development scripts
    ├── dev-setup.sh          # Local development setup
    └── release.sh            # Release automation script
```

### Branch Strategy

This action follows the standard GitHub Action branch strategy:

- **`main` branch**: Development, features, bug fixes
- **`v1` branch**: Production releases (semantic versioning)

**Maintenance Workflow:**
1. Develop on `main` branch
2. Test changes locally
3. Run `./scripts/release.sh` to release
4. Script automatically merges `main` → `v1` and triggers build

**For Major Version Updates:**
- Create `v2`, `v3` branches for breaking changes
- Update `action.yml` to point to new version
- Maintain backward compatibility

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions, please:
1. Check the [troubleshooting section](#troubleshooting)
2. Search existing [issues](https://github.com/flazouh/discord-tracker-action/issues)
3. Create a new issue with detailed information about your problem

## Changelog

### v1.0.0
- Initial release
- Support for pipeline initialization, step updates, completion, and failure handling
- Rich Discord embeds with progress tracking
- Comprehensive error handling and logging 