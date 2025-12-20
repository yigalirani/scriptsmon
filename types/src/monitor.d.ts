import { type Runner, type Folder, type LocationString } from './data.js';
import { type Expression } from "acorn";
import { type s2t } from "@yigal/base_types";
interface Watchers {
    watches: s2t<LocationString[]>;
    autowatch_scripts: string[];
}
export declare function parse_watchers(ast: Expression, full_pathname: string): Watchers;
export declare function parse_scripts2(ast: Expression, full_pathname: string): s2t<LocationString>;
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
export {};
