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
export interface Lstr extends Pos {
    str: string;
}
export interface Filename {
    rel: Lstr;
    full: string;
}
export type Reason = 'change' | 'initial' | 'remove' | 'add' | 'user';
export interface FullReason {
    reason: Reason;
    full_filename?: string;
    rel?: string;
}
export interface Run {
    start_time: number;
    end_time: number | undefined;
    full_reason: FullReason;
    output: string[];
    Err: Error | undefined;
    exit_code: number | undefined;
    stopped: undefined | true;
    run_id: number;
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
    effective_watch: Filename[];
    tags: string[];
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
export type Runs = Record<string, Run[]>;
export interface RunnerReport {
    command: "RunnerReport";
    root: Folder;
    base_uri: string;
    runs: Runs;
    monitored: string[];
}
