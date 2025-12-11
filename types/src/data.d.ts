export interface Watcher {
    watch?: string[];
    filter?: string;
    pre?: string;
}
export type Scriptsmon = Record<string, Watcher | string[]> & {
    $watch?: string[];
    autorun?: string[];
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
export interface Runner {
    type: 'runner';
    name: string;
    full_pathname: string;
    id: string;
    watcher: Watcher;
    script: string;
    autorun: boolean;
    runs: Run[];
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
