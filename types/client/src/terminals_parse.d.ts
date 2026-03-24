import type { ParseRange } from './terminal.js';
export declare function parse_to_ranges(input: string, parser_state: string | undefined): {
    parser_state: string | undefined;
    ranges: ParseRange[];
};
export declare function parse_line(line: string, parser_state: unknown): {
    parser_state: string | undefined;
    ranges: ParseRange[];
};
