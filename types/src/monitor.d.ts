import { IPty } from "@lydell/node-pty";
interface Watcher {
    watch?: string[];
    filter?: string;
    pre?: string;
}
export type Scriptsmon = Record<string, Watcher | string[]> & {
    $watch?: string[];
    autorun?: string[];
};
type State = "ready" | "done" | "crashed" | "running" | "failed" | "spawning" | "stopped";
type StrType = 'stderr' | 'stdout';
interface Mystring {
    type: StrType;
    data: string;
}
export interface RunnerBase extends Watcher {
    type: 'runner';
    name: string;
    full_pathname: string;
    script: string;
    autorun: boolean;
    state: State;
    last_start_time: number | undefined;
    last_end_time: number | undefined;
    start_time: number | undefined;
    reason: string;
    last_reason: string;
    last_err: Error | undefined;
    output: Mystring[];
    id: string;
}
export declare const runner_base_keys: (keyof RunnerBase)[];
export interface Runner extends RunnerBase {
    abort_controller: AbortController;
    child: IPty | undefined;
    start: (reason: string) => Promise<void>;
}
export interface Folder {
    type: 'folder';
    name: string;
    full_pathname: string;
    folders: Array<Folder>;
    runners: Array<Runner>;
    scriptsmon: Scriptsmon;
}
export declare function read_package_json(full_pathnames: string[]): Promise<Folder>;
export {};
