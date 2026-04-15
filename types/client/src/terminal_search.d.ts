export interface SearchData {
    term_el: HTMLElement;
    term_text: HTMLElement;
    highlight: Highlight;
}
interface LineRanges {
    line_number: number;
    ranges: Array<Range>;
    line_length: number;
}
declare class RegExpSearcher {
    search_data: SearchData;
    regex: RegExp;
    children: HTMLCollection;
    last_line_ranges: LineRanges | undefined;
    line_head: number;
    constructor(search_data: SearchData, regex: RegExp);
    get_line_ranges(line_number: number): {
        line_length: number;
        ranges: Range[];
        line_number: number;
    } | undefined;
    get_start_line(): number;
    apply_cur_ranges(cur_ranges: LineRanges): void;
    iter: () => void;
}
export declare class TerminalSearch {
    private data;
    find_widget: HTMLElement;
    interval_id: NodeJS.Timeout;
    regex_searcher: RegExpSearcher | undefined;
    regex: RegExp | undefined;
    selection: number;
    constructor(data: SearchData);
    show(): void;
    calc_match_status_and_apply_selection(): string;
    iter: () => void;
    input(): HTMLInputElement | null;
    search_term_clear(): void;
    update_search: () => void;
    onclick: (event: MouseEvent) => void;
}
export {};
