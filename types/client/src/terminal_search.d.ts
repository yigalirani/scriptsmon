interface NodeOffset {
    node: Node;
    node_pos: number;
}
export interface SearchData {
    term_el: HTMLElement;
    term_text: HTMLElement;
    highlight: Highlight;
    term_plain_text: string;
    lines: BigInt64Array;
}
declare class RegExpSearcher {
    search_data: SearchData;
    regex: RegExp;
    text_head: number;
    line: number;
    children: HTMLCollection;
    walker: TreeWalker | undefined;
    walker_offset: number;
    constructor(search_data: SearchData, regex: RegExp);
    advance_line(text_pos: number): void;
    get_node_offset(text_pos: number): NodeOffset;
    iter: () => void;
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
}
export {};
