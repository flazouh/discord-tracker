import { StepStatusHelper } from './models';
export function buildInitEmbed(prNumber, prTitle, author, repository, branch) {
    return {
        title: `🚀 Pipeline Started - PR #${prNumber}`,
        description: `**${prTitle}**`,
        color: 0x0099ff, // Blue
        fields: [
            {
                name: '👤 Author',
                value: author,
                inline: true,
            },
            {
                name: '📦 Repository',
                value: repository,
                inline: true,
            },
            {
                name: '🌿 Branch',
                value: branch,
                inline: true,
            },
            {
                name: '📊 Status',
                value: '⏳ Initializing pipeline...',
                inline: false,
            },
        ],
        footer: {
            text: `Pipeline started at ${new Date().toLocaleString()}`,
        },
        timestamp: new Date().toISOString(),
    };
}
export function buildStepUpdateEmbed(prNumber, prTitle, steps, currentStep, totalSteps) {
    const progress = getProgress(steps);
    const currentStepInfo = steps.find((step) => step.number === currentStep);
    // Build step list
    const stepFields = steps.map((step) => {
        const emoji = StepStatusHelper.getEmoji(step.status);
        const statusText = step.status.charAt(0).toUpperCase() + step.status.slice(1);
        let value = `${emoji} **${step.name}** - ${statusText}`;
        // Add additional info if available
        if (step.additionalInfo && step.additionalInfo.length > 0) {
            const infoText = step.additionalInfo.map(([key, val]) => `**${key}:** ${val}`).join(', ');
            value += `\n└ ${infoText}`;
        }
        return {
            name: `Step ${step.number}`,
            value,
            inline: false,
        };
    });
    // Determine overall status and color
    let overallStatus = '🔄 Running';
    let color = 0x0099ff; // Blue
    if (progress.completed === progress.total && progress.total > 0) {
        const hasFailures = steps.some((step) => step.status === 'failed');
        if (hasFailures) {
            overallStatus = '❌ Failed';
            color = 0xff0000; // Red
        }
        else {
            overallStatus = '✅ Completed';
            color = 0x00ff00; // Green
        }
    }
    const fields = [
        {
            name: '📊 Progress',
            value: `${progress.completed}/${progress.total} steps completed (${progress.percentage}%)`,
            inline: true,
        },
        {
            name: '🎯 Current Step',
            value: currentStepInfo ? currentStepInfo.name : `Step ${currentStep}`,
            inline: true,
        },
        {
            name: '📋 Status',
            value: overallStatus,
            inline: true,
        },
    ];
    // Add step details if there are any
    if (stepFields.length > 0) {
        fields.push({
            name: '📝 Steps',
            value: stepFields.length > 0 ? 'See fields below' : 'No steps recorded',
            inline: false,
        });
    }
    return {
        title: `🔄 Pipeline Update - PR #${prNumber}`,
        description: `**${prTitle}**`,
        color,
        fields: [...fields, ...stepFields],
        footer: {
            text: `Last updated at ${new Date().toLocaleString()}`,
        },
        timestamp: new Date().toISOString(),
    };
}
export function buildCompletionEmbed(prNumber, prTitle, steps, totalSteps, startTime) {
    const progress = getProgress(steps);
    const duration = Date.now() - startTime.getTime();
    const durationMinutes = Math.floor(duration / 60000);
    const durationSeconds = Math.floor((duration % 60000) / 1000);
    const hasFailures = steps.some((step) => step.status === 'failed');
    const hasSkipped = steps.some((step) => step.status === 'skipped');
    let status = '✅ Success';
    let color = 0x00ff00; // Green
    let emoji = '🎉';
    if (hasFailures) {
        status = '❌ Failed';
        color = 0xff0000; // Red
        emoji = '💥';
    }
    else if (hasSkipped) {
        status = '⚠️ Completed with skipped steps';
        color = 0xffff00; // Yellow
        emoji = '⚠️';
    }
    const fields = [
        {
            name: '📊 Final Status',
            value: `${emoji} ${status}`,
            inline: true,
        },
        {
            name: '⏱️ Duration',
            value: `${durationMinutes}m ${durationSeconds}s`,
            inline: true,
        },
        {
            name: '📈 Completion',
            value: `${progress.completed}/${progress.total} steps (${progress.percentage}%)`,
            inline: true,
        },
    ];
    // Add step summary
    if (steps.length > 0) {
        const stepSummary = steps
            .map((step) => {
            const stepEmoji = StepStatusHelper.getEmoji(step.status);
            return `${stepEmoji} ${step.name}`;
        })
            .join('\n');
        fields.push({
            name: '📝 Steps Summary',
            value: stepSummary,
            inline: false,
        });
    }
    return {
        title: `${emoji} Pipeline ${hasFailures ? 'Failed' : 'Completed'} - PR #${prNumber}`,
        description: `**${prTitle}**`,
        color,
        fields,
        footer: {
            text: `Pipeline completed at ${new Date().toLocaleString()}`,
        },
        timestamp: new Date().toISOString(),
    };
}
// Helper function to get progress information
function getProgress(steps) {
    const total = steps.length;
    const completed = steps.filter((step) => step.status === 'success' || step.status === 'failed' || step.status === 'skipped').length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
}
//# sourceMappingURL=messageBuilder.js.map