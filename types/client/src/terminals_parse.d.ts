import type { Replacement } from './terminals_ansi.js';
interface IlinkData {
    start: number;
    end: number;
    row: number;
    col: number;
    source_file: string;
}
export declare function parse_to_links(input: string, ancore: string | undefined): {
    links: IlinkData[];
    ancore: string | undefined;
};
export declare function parse(line: string, old_ancore: string | undefined): {
    replacments: Replacement[];
    ancore: string | undefined;
};
export {};
