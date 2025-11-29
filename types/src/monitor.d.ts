import { ChildProcessWithoutNullStreams } from "child_process";
interface Watcher {
    watch?: string[];
    filter?: string;
    pre?: string;
}
export type Scriptsmon = Record<string, Watcher | string[]> & {
    $watch?: string[];
    autorun?: string[];
};
type State = "ready" | "done" | "crashed" | "running";
export interface Runner extends Watcher {
    type: 'runner';
    name: string;
    full_pathname: string;
    script: string;
    autorun: boolean;
    state: State;
    start_time: number | undefined;
    last_duration: number | undefined;
    child: ChildProcessWithoutNullStreams | undefined;
    start: () => undefined;
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
