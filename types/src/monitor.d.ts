import type { Runner, Folder } from './data.js';
export declare class Monitor {
    full_pathnames: string[];
    runner_ctrl: {
        ipty: {};
    };
    root?: Folder;
    watched_dirs: Set<string>;
    changed_dirs: Set<string>;
    watched_runners: Runner[];
    constructor(full_pathnames: string[]);
    read_package_json(): Promise<void>;
    get_root(): Folder;
    run_runner(runner_id: string, reason: string): Promise<void>;
    extract_base(): Folder;
    start_watching(): void;
}
