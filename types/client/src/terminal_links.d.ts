declare class Line {
    private readonly offsets;
    private readonly start_y;
    readonly len: number;
    readonly text: string;
    constructor(strings: string[], start_y?: number);
    find_cell_pos(pos: number): IBufferCellPosition | undefined;
    calc_range(start_pos: number, end_pos: number): IBufferRange;
    private binary_search_offsets;
}
interface IlinkData {
    start: number;
    end: number;
    text: string;
    row: number;
    col: number;
    source_file: string;
}
declare class LinkParser {
    workspace_folder: string;
    y_head: number;
    is_done: boolean;
    buffer: any;
    ancore: string | undefined;
    line_map: Map<number, Set<ILink>>;
    private add_link;
    y_links(y: number): ILink[];
    private skip_wrapped_lines;
    private read_line;
    constructor(term: Terminal, workspace_folder: string);
    make_ilink(link_data: IlinkData, line: Line): ILink;
    iter: () => void;
}
export declare class MyLinkProvider implements ILinkProvider {
    terminal: Terminal;
    workspace_folder: string;
    parser: LinkParser;
    constructor(terminal: Terminal, workspace_folder: string);
    private make_parser;
    provideLinks(y: number, callback: (links: ILink[] | undefined) => void): void;
    reset(): void;
}
export {};
