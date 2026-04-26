import type { Run, Runner, Folder, Runs, RunnerReport, FullReason } from './data.js';
import { Watcher, type IdRelPath } from './watcher.js';
export declare function mkdir_write_file(filePath: string, data: string, cache?: boolean): Promise<void>;
export declare class Monitor {
    workspace_folders: string[];
    ipty: Record<string, AbortController>;
    runs: Runs;
    monitored: Set<string>;
    root?: Folder;
    watcher: Watcher;
    dump_debug_enabled: boolean;
    constructor(workspace_folders: string[]);
    start_monitor(): Promise<void>;
    get_runner_runs(runner: Runner): Run[];
    is_ready_to_start(runner: Runner): boolean;
    extract_report(base_uri: string): RunnerReport;
    stop({ runner }: {
        runner: Runner;
    }): Promise<void>;
    run_runner2({ //this is not async function on purpuse
    runner, full_reason, }: {
        runner: Runner;
        full_reason: FullReason;
    }): Promise<void>;
    find_runners(root: Folder, filter: (x: Runner) => boolean): Runner[];
    calc_one_debug_name: (workspace_folder: string) => string;
    collect_watch_requests(folder: Folder): IdRelPath[];
    dump_debug: () => Promise<void>;
    toggle_dump_debug(): void;
    read_package_json_and_start_watching(): Promise<void>;
    iter: () => Promise<void>;
    get_root(): Folder;
    stop_runner({ runner_id }: {
        runner_id: string;
    }): Promise<void>;
    run_runner({ runner_id, full_reason }: {
        runner_id: string;
        full_reason: FullReason;
    }): Promise<void>;
    toggle_watch_state(runner_id: string): void;
    start_watching(): void;
}
