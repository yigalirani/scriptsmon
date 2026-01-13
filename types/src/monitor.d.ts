import { type IPty } from "@homebridge/node-pty-prebuilt-multiarch";
import type { Run, Runner, Folder } from './data.js';
import { Watcher } from './watcher.js';
import { Repeater } from "@yigal/base_types";
type Runs = Record<string, Run[]>;
export interface RunnerReport {
    command: "RunnerReport";
    root: Folder;
    base_uri: string;
    runs: Runs;
}
export declare function mkdir_write_file(filePath: string, data: string, cache?: boolean): Promise<void>;
export declare class Monitor {
    workspace_folders: string[];
    ipty: Record<string, IPty>;
    runs: Runs;
    root?: Folder;
    watcher: Watcher;
    repeater: Repeater;
    constructor(workspace_folders: string[]);
    run(): Promise<void>;
    get_runner_runs(runner: Runner): Run[];
    is_ready_to_start(runner: Runner): boolean;
    extract_report(base_uri: string): RunnerReport;
    stop({ runner }: {
        runner: Runner;
    }): Promise<void>;
    run_runner2({ //this is not async function on purpuse
    runner, reason, }: {
        runner: Runner;
        reason: string;
    }): Promise<void>;
    find_runners(root: Folder, filter: (x: Runner) => boolean): Runner[];
    calc_one_debug_name: (workspace_folder: string) => string;
    add_watch: (folder: Folder) => void;
    dump_debug(): Promise<void>;
    get_reason(id: string): string | undefined;
    get_changed_runners(monitored_runners: Runner[]): {
        runner_id: string;
        reason: string;
    }[];
    iter: () => Promise<void>;
    get_root(): Folder;
    run_runner({ runner_id, reason }: {
        runner_id: string;
        reason: string;
    }): Promise<void>;
    start_watching(): void;
}
export {};
