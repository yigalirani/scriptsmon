interface Watcher {
    watch?: string[];
    filter?: string;
    pre?: string;
}
export type Scriptsmon = Record<string, Watcher | string[]> & {
    $watch?: string[];
    autorun?: string[];
};
interface Runner extends Watcher {
    name: string;
    full_pathname: string;
    script: string;
    autorun: boolean;
}
interface Folder {
    name: string;
    full_pathname: string;
    folders: Array<Folder>;
    runners: Array<Runner>;
}
export declare function read_package_json(full_pathnamezs: string[]): Promise<Folder>;
export {};
