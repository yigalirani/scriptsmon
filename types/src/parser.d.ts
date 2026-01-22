import type { Runner, Folder, RunnerBase } from './data.js';
export declare function find_base(root: Folder, id: string): RunnerBase | undefined;
export declare function find_runner(root: Folder, id: string): Runner | undefined;
export declare function read_package_json(workspace_folders: string[]): Promise<Folder>;
export declare function to_json(x: unknown, skip_keys?: string[]): string;
