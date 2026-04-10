export interface SearchData {
    term_el: HTMLElement;
    term_text: HTMLElement;
    highlight: Highlight;
    term_plain_text: string;
    lines: number[];
}
declare class RegExpSearcher {
    private regex;
    private data;
    text_head: number;
    line_head: number;
    constructor(regex: RegExp, data: SearchData);
    get_next_range(): Generator<Range, void, unknown>;
}
export declare class TerminalSearch {
    private data;
    find_widget: HTMLElement;
    interval_id: NodeJS.Timeout;
    regex_searcher: RegExpSearcher | undefined;
    regex: RegExp | undefined;
    constructor(data: SearchData);
    show(): void;
    iter: () => void;
    input(): HTMLInputElement | null;
    search_term_clear(): void;
    update_search: () => void;
    onclick: (event: MouseEvent) => void;
    text_added(): void;
}
export {};
