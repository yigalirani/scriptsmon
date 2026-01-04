import { type IPty } from "@homebridge/node-pty-prebuilt-multiarch";
import type { Run, Runner, Folder } from './data.js';
interface RunnerWithReason {
    runner: Runner;
    reason: string;
}
export declare class Foo {
    a(): number;
    b(): number;
}
export declare class Monitor {
    workspace_folders: string[];
    ipty: Record<string, IPty>;
    runs: Record<string, Run[]>;
    root?: Folder;
    watched_dirs: Set<string>;
    changed_dirs: Set<string>;
    watched_runners: Runner[];
    is_running: boolean;
    constructor(workspace_folders: string[]);
    get_runner_runs(runner: Runner): Run[];
    is_ready_to_start(runner: Runner): boolean;
    extract_base(folder: Folder | undefined): Folder;
    stop({ runner }: {
        runner: Runner;
    }): Promise<void>;
    run_runner2({ //this is not async function on purpuse
    runner, reason, }: {
        runner: Runner;
        reason: string;
    }): Promise<void>;
    find_runners(root: Folder, filter: (x: Runner) => boolean): Runner[];
    collect_watch_dirs(root: Folder): Set<string>;
    watch_to_set(watched_dirs: Set<string>, changed_dirs: Set<string>): void;
    get_runners_by_changed_dirs(root: Folder, changed_dirs: Set<string>): RunnerWithReason[];
    calc_one_debug_name: (workspace_folder: string) => void;
    runRepeatedly(): Promise<void>;
    read_package_json(): Promise<void>;
    get_root(): Folder;
    run_runner(runner_id: string, reason: string): Promise<void>;
    start_watching(): void;
}
export {};
