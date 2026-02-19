import type { WebviewMessage } from '../../src/extension.js';
import type { RunnerReport, Run, Runner, State } from '../../src/data.js';
export interface FileLocation {
    file: string;
    row: number;
    col: number;
}
export declare function post_message(msg: WebviewMessage): void;
export declare function calc_last_run(report: RunnerReport, runner: Runner): Run | undefined;
export declare function calc_runner_status(report: RunnerReport, runner: Runner): {
    version: number;
    state: State;
};
