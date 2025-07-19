import * as core from '@actions/core';
import { PipelineTracker } from './pipelineTracker';
import { TrackerError } from './error';
import { FileStorage } from './storage';

async function run(): Promise<void> {
  try {
    // Get inputs
    const action = core.getInput('action', { required: true });
    const prNumber = core.getInput('pr_number');
    const prTitle = core.getInput('pr_title');
    const author = core.getInput('author');
    const repository = core.getInput('repository');
    const branch = core.getInput('branch');
    const stepNumber = core.getInput('step_number');
    const totalSteps = core.getInput('total_steps');
    const stepName = core.getInput('step_name');
    const status = core.getInput('status');
    const additionalInfo = core.getInput('additional_info');
    const errorMessage = core.getInput('error_message');
    const botToken = core.getInput('discord_bot_token', { required: true });
    const channelId = core.getInput('discord_channel_id', { required: true });

    // Initialize tracker with file storage
    const storage = new FileStorage();
    const tracker = new PipelineTracker(botToken, channelId, storage);
    core.info('Pipeline tracker initialized with file storage');

    let result: void;

    switch (action) {
      case 'init':
        if (!prNumber || !prTitle || !author || !repository || !branch) {
          throw new Error('Missing required parameters for init action');
        }
        core.info(`Initializing pipeline tracker for PR #${prNumber}`);
        result = await tracker.initPipeline(prNumber, prTitle, author, repository, branch);
        break;

      case 'step': {
        if (!stepNumber || !totalSteps || !stepName || !status) {
          throw new Error('Missing required parameters for step action');
        }
        const stepNum = parseInt(stepNumber, 10) || 1;
        const total = parseInt(totalSteps, 10) || 1;

        let additionalInfoPairs: Array<[string, string]> = [];
        if (additionalInfo) {
          try {
            const parsedInfo = JSON.parse(additionalInfo);
            if (typeof parsedInfo === 'object' && parsedInfo !== null) {
              additionalInfoPairs = Object.entries(parsedInfo).map(([key, value]) => [
                key,
                String(value),
              ]);
            }
          } catch (e) {
            core.warning(
              'Failed to parse additionalInfo JSON, continuing with empty additional info'
            );
          }
        }

        core.info(`Updating step ${stepNum}: ${stepName}`);
        result = await tracker.updateStep(stepNum, total, stepName, status, additionalInfoPairs);
        break;
      }

      case 'complete':
        core.info('Completing pipeline');
        result = await tracker.completePipeline();
        break;

      case 'fail':
        if (!stepName || !errorMessage) {
          throw new Error('Missing required parameters for fail action');
        }
        core.error(`Pipeline failed at step: ${stepName}`);
        result = await tracker.updateStep(1, 1, stepName, 'failed', [['error', errorMessage]]);
        break;

      default:
        throw new Error(`Invalid action: ${action}`);
    }

    core.info('Action completed successfully');
    core.setOutput('success', 'true');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    core.error(`Action failed: ${errorMessage}`);
    core.setOutput('error', errorMessage);
    core.setOutput('success', 'false');
    core.setFailed(errorMessage);
  }
}

run();
