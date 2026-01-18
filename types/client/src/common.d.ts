import type { WebviewMessage } from '../../src/extension.js';
import type { Runner } from '../../src/data.js';
import type { RunnerReport } from '../../src/monitor.js';
export interface FileLocation {
    file: string;
    row: number;
    col: number;
}
export declare function post_message(msg: WebviewMessage): void;
export declare function calc_runner_status(report: RunnerReport, runner: Runner): {
    version: number;
    state: string;
};
