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
export interface Lstr {
    str: string;
    source_file: string;
    start: number;
    end: number;
}
export interface Filename {
    rel: Lstr;
    full: string;
}
export interface Runner {
    name: string;
    workspace_folder: string;
    id: string;
    script: Lstr;
    runs: Run[];
    watched: boolean;
    effective_watch: Filename[];
}
export interface FolderError {
    message: Lstr;
}
export interface Folder {
    name: string;
    workspace_folder: string;
    id: string;
    folders: Array<Folder>;
    runners: Array<Runner>;
}
