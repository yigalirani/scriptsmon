import type { Pos } from './vscode_utils.ts';
export type { Pos };
export interface Watcher {
    watch?: string[];
    filter?: string;
    pre?: string;
}
export type Scriptsmon = Record<string, Watcher | string[]> & {
    $watch?: string[];
    watched?: string[];
};
export type State = "ready" | "done" | "error" | "running" | "stopped";
export interface Run {
    start_time: number;
    end_time: number | undefined;
    reason: string;
    output: string[];
    Err: Error | undefined;
    exit_code: number | undefined;
    stopped: undefined | true;
    run_id: number;
}
export interface Lstr extends Pos {
    str: string;
}
export interface Filename {
    rel: Lstr;
    full: string;
}
export interface RunnerBase {
    pos: Pos | undefined;
    id: string;
    need_ctl: boolean;
}
export interface Runner extends RunnerBase {
    name: string;
    workspace_folder: string;
    script: string;
    watched_default: boolean;
    effective_watch: Filename[];
}
export interface FolderError extends RunnerBase {
    message: string;
}
export interface Folder extends RunnerBase {
    name: string;
    workspace_folder: string;
    folders: Array<Folder>;
    runners: Array<Runner>;
    errors: Array<FolderError>;
}
