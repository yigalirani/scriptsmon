import type { Runner, Folder } from './data.js';
export declare class Monitor {
    workspace_folders: string[];
    runner_ctrl: {
        ipty: {};
    };
    root?: Folder;
    watched_dirs: Set<string>;
    changed_dirs: Set<string>;
    watched_runners: Runner[];
    is_running: boolean;
    constructor(workspace_folders: string[]);
    runRepeatedly(): Promise<void>;
    read_package_json(): Promise<void>;
    get_root(): Folder;
    run_runner(runner_id: string, reason: string): Promise<void>;
    extract_base(): Folder;
    start_watching(): void;
}
