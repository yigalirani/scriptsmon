import type { Runner, Folder } from './data.js';
export declare function find_runner(root: Folder, id: string): Runner | undefined;
export declare function read_package_json(workspace_folders: string[]): Promise<Folder>;
export declare function to_json(x: unknown): string;
