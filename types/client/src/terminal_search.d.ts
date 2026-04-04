interface StartEnd {
    start: number;
    end: number;
}
declare class NodeIndex {
    root: HTMLElement;
    text_nodes: Node[];
    plain_text: string;
    node_offsets: number[];
    walker: TreeWalker;
    constructor(root: HTMLElement);
    iter: () => void;
    find_node_index_binary(target_index: number): number;
    get_ranges(offsets: StartEnd[]): Range[];
}
declare class RegExpSearcher {
    private index;
    private regex;
    private highlight;
    constructor(index: NodeIndex, regex: RegExp, highlight: Highlight);
    iter: () => void;
}
export declare class TerminalSearch {
    private term_el;
    private term_text;
    private highlight;
    find_widget: HTMLElement;
    index: NodeIndex;
    interval_id: NodeJS.Timeout;
    regex_searcher: RegExpSearcher | undefined;
    regex: RegExp | undefined;
    constructor(term_el: HTMLElement, term_text: HTMLElement, highlight: Highlight);
    show(): void;
    iter: () => void;
    input(): HTMLInputElement | null;
    search_term_clear(): void;
    update_search: () => void;
    onclick: (event: MouseEvent) => void;
    text_added(): void;
}
export {};
