import { PipelineTracker } from "./pipeline_tracker"; // Assuming PipelineTracker will be converted to TS
import { TrackerError } from "./error"; // Assuming TrackerError will be converted to TS
import * as fs from "fs";
import * as path from "path";

// Placeholder for PipelineTracker and its methods. These will need to be implemented in TypeScript.
// For now, we'll assume they exist and have similar signatures.

async function main() {
	console.info("Starting Discord Tracker GitHub Action");

	// Get GitHub output path
	const githubOutputPath = process.env.GITHUB_OUTPUT;
	if (!githubOutputPath) {
		const errorMsg = "Missing environment variable: GITHUB_OUTPUT";
		console.error(`Error: ${errorMsg}`);
		// In a real scenario, we'd want to write to stderr or a log file if GITHUB_OUTPUT is not set.
		// For now, we'll simulate writing to a file if possible, or just exit.
		try {
			// Use path.join to ensure correct path separators
			fs.writeFileSync(
				path.join(process.cwd(), "error.log"),
				`error=${errorMsg}\nsuccess=false`,
			);
		} catch (e) {
			console.error("Could not write to error.log:", e);
		}
		process.exit(1);
	}

	// Get action arguments from command line
	// process.argv[0] is 'node', process.argv[1] is the script path
	const args = process.argv.slice(2);

	if (args.length < 14) {
		const errorMsg = "Insufficient arguments provided";
		console.error(`Error: ${errorMsg}`);
		fs.writeFileSync(githubOutputPath, `error=${errorMsg}\nsuccess=false`);
		process.exit(1);
	}

	const [
		action,
		prNumber,
		prTitle,
		author,
		repository,
		branch,
		stepNumber,
		totalSteps,
		stepName,
		status,
		additionalInfo,
		errorMessage,
		botToken,
		channelId,
	] = args;

	let tracker: PipelineTracker;
	try {
		// Assuming PipelineTracker constructor takes botToken and channelId
		tracker = new PipelineTracker(botToken, channelId);
		console.info("Pipeline tracker initialized");
	} catch (e: any) {
		const errorMsg = `Failed to create pipeline tracker: ${e.message}`;
		console.error(`Error: ${errorMsg}`);
		fs.writeFileSync(githubOutputPath, `error=${errorMsg}\nsuccess=false`);
		process.exit(1);
	}

	let result: any; // Placeholder for the result of tracker operations

	try {
		switch (action) {
			case "init":
				if (!prNumber || !prTitle || !author || !repository || !branch) {
					const errorMsg = "Missing required parameters for init action";
					console.error(`Error: ${errorMsg}`);
					fs.writeFileSync(
						githubOutputPath,
						`error=${errorMsg}\nsuccess=false`,
					);
					process.exit(1);
				}
				console.info(`Initializing pipeline tracker for PR #${prNumber}`);
				result = await tracker.initPipeline(
					prNumber,
					prTitle,
					author,
					repository,
					branch,
				);
				break;
			case "step":
				{
					if (!stepNumber || !totalSteps || !stepName || !status) {
						const errorMsg = "Missing required parameters for step action";
						console.error(`Error: ${errorMsg}`);
						fs.writeFileSync(
							githubOutputPath,
							`error=${errorMsg}\nsuccess=false`,
						);
						process.exit(1);
					}
					const stepNum = parseInt(stepNumber, 10) || 1;
					const total = parseInt(totalSteps, 10) || 1;

					let additionalInfoPairs: Array<[string, string]> = [];
					if (additionalInfo) {
						try {
							const parsedInfo = JSON.parse(additionalInfo);
							if (typeof parsedInfo === "object" && parsedInfo !== null) {
								additionalInfoPairs = Object.entries(parsedInfo).map(
									([key, value]) => [key, String(value)],
								);
							}
						} catch (e) {
							console.warn("Failed to parse additionalInfo JSON:", e);
							// Continue with empty additionalInfoPairs if parsing fails
						}
					}

					console.info(`Updating step ${stepNum}: ${stepName}`);
					result = await tracker.updateStep(
						stepNum,
						total,
						stepName,
						status,
						additionalInfoPairs,
					);
				}
				break;
			case "complete":
				console.info("Completing pipeline");
				result = await tracker.completePipeline();
				break;
			case "fail":
				if (!stepName || !errorMessage) {
					const errorMsg = "Missing required parameters for fail action";
					console.error(`Error: ${errorMsg}`);
					fs.writeFileSync(
						githubOutputPath,
						`error=${errorMsg}\nsuccess=false`,
					);
					process.exit(1);
				}
				console.error(`Pipeline failed at step: ${stepName}`);
				// Assuming updateStep can handle a "failed" status and an error message
				result = await tracker.updateStep(1, 1, stepName, "failed", [
					["error", errorMessage],
				]);
				break;
			default: {
				const errorMsg = `Invalid action: ${action}`;
				console.error(`Error: ${errorMsg}`);
				fs.writeFileSync(githubOutputPath, `error=${errorMsg}\nsuccess=false`);
				process.exit(1);
			}
		}

		console.info("Action completed successfully");
		fs.writeFileSync(githubOutputPath, "success=true");
		process.exit(0); // Exit successfully
	} catch (e: any) {
		const errorMsg = `Action failed: ${e.message}`;
		console.error(`Error: ${errorMsg}`);
		fs.writeFileSync(githubOutputPath, `error=${errorMsg}\nsuccess=false`);
		process.exit(1);
	}
}

main();
