import type { Folder } from './data.js';
export declare function read_package_json(full_pathnames: string[]): Promise<Folder>;
export declare function to_json(x: unknown): string;
