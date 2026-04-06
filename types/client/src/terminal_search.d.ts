interface NodeOffset {
    node: Node;
    start_pos: number;
    end_pos: number;
}
declare class NodeIndex {
    root: HTMLElement;
    node_offsets: NodeOffset[];
    plain_text: string;
    walker: TreeWalker;
    last_bottom: number | undefined;
    constructor(root: HTMLElement);
    iter: () => void;
}
declare class RegExpSearcher {
    private index;
    private regex;
    private highlight;
    head: number;
    constructor(index: NodeIndex, regex: RegExp, highlight: Highlight);
    advance_head(pos: number): {
        node: Node;
        pos: number;
    };
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
