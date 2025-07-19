// Pipeline Types
export var StepStatus;
(function (StepStatus) {
    StepStatus["Pending"] = "pending";
    StepStatus["Running"] = "running";
    StepStatus["Success"] = "success";
    StepStatus["Failed"] = "failed";
    StepStatus["Skipped"] = "skipped";
})(StepStatus || (StepStatus = {}));
// Step Status Helper
export class StepStatusHelper {
    static fromStr(status) {
        const normalizedStatus = status.toLowerCase().trim();
        switch (normalizedStatus) {
            case 'pending':
            case 'waiting':
                return StepStatus.Pending;
            case 'running':
            case 'in_progress':
            case 'in-progress':
                return StepStatus.Running;
            case 'success':
            case 'passed':
            case 'completed':
                return StepStatus.Success;
            case 'failed':
            case 'error':
                return StepStatus.Failed;
            case 'skipped':
            case 'ignore':
                return StepStatus.Skipped;
            default:
                return `Invalid status: ${status}`;
        }
    }
    static isValid(status) {
        const result = this.fromStr(status);
        return typeof result === 'string' && result.startsWith('Invalid status:') === false;
    }
    static getColor(status) {
        switch (status) {
            case StepStatus.Pending:
                return 0x808080; // Gray
            case StepStatus.Running:
                return 0x0099ff; // Blue
            case StepStatus.Success:
                return 0x00ff00; // Green
            case StepStatus.Failed:
                return 0xff0000; // Red
            case StepStatus.Skipped:
                return 0xffff00; // Yellow
            default:
                return 0x808080; // Gray
        }
    }
    static getEmoji(status) {
        switch (status) {
            case StepStatus.Pending:
                return '⏳';
            case StepStatus.Running:
                return '🔄';
            case StepStatus.Success:
                return '✅';
            case StepStatus.Failed:
                return '❌';
            case StepStatus.Skipped:
                return '⏭️';
            default:
                return '❓';
        }
    }
}
// Step Info Manager
export class StepInfoManager {
    static new(number, name, status, additionalInfo = []) {
        return {
            number,
            name,
            status,
            additionalInfo,
        };
    }
    static markCompleted(step) {
        step.completedAt = new Date();
    }
    static isCompleted(step) {
        return (step.status === StepStatus.Success ||
            step.status === StepStatus.Failed ||
            step.status === StepStatus.Skipped);
    }
    static getProgress(steps) {
        const total = steps.length;
        const completed = steps.filter((step) => this.isCompleted(step)).length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { completed, total, percentage };
    }
}
//# sourceMappingURL=models.js.map