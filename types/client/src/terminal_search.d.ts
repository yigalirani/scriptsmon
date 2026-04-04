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
    iter(): void;
    find_node_index_binary(target_index: number): number;
    get_ranges(offsets: StartEnd[]): Range[];
}
export declare class TerminalSearch {
    private term_el;
    private term_text;
    find_widget: HTMLElement;
    index: NodeIndex;
    constructor(term_el: HTMLElement, term_text: HTMLElement);
    show(): void;
    input(): HTMLInputElement | null;
    search_clear(): void;
    update_search: () => void;
    onclick: (event: MouseEvent) => void;
    text_added(): void;
}
export {};
