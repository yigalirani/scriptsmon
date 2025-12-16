import { Folder } from './data.js';
export declare class Monitor {
    full_pathnames: string[];
    runner_ctrl: {
        ipty: {};
    };
    root?: Folder;
    constructor(full_pathnames: string[]);
    read_package_json(): Promise<void>;
    get_root(): Folder;
    run_runner(runner_id: string, reason: string): void;
    extract_base(): Folder;
    start_watching(): void;
}
