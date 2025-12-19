import { Runner, Folder, LocationString } from './data.js';
import * as acorn from "acorn";
import { s2t } from "@yigal/base_types";
export declare function parse_scripts2(ast: acorn.Expression, full_pathname: string): s2t<LocationString>;
export declare function to_json(x: unknown): string;
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
