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
export interface Filename {
    rel: string;
    full: string;
}
export interface Runner {
    type: 'runner';
    name: string;
    full_pathname: string;
    id: string;
    the_watcher?: Watcher | string[];
    script: string;
    runs: Run[];
    watched: boolean;
    effective_watch: Filename[];
}
export interface Folder {
    type: 'folder';
    name: string;
    full_pathname: string;
    id: string;
    folders: Array<Folder>;
    runners: Array<Runner>;
    scriptsmon: Scriptsmon;
}
export type FolderRunner = Runner | Folder;
