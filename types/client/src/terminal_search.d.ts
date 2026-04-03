export declare class TerminalSearch {
    private term_el;
    find_widget: HTMLElement;
    constructor(term_el: HTMLElement);
    show(): void;
    update_search(): void;
    onclick: (event: MouseEvent) => void;
    text_added(): void;
}
