import { type Style } from './terminals_ansi.js';
export interface ParseRange {
    start: number;
    end: number;
    dataset: Record<string, string>;
}
export interface TerminalListener {
    parse: (line_text: string, state: unknown) => {
        parser_state: unknown;
        ranges: Array<ParseRange>;
    };
    dataset_click: (dataset: Record<string, string>) => void;
    open_link: (url: string) => void;
}
type Channel = 'stderr' | 'stdout';
interface ChannelState {
    last_line: string;
    parser_state: unknown;
    style: Style;
}
export declare class Terminal {
    private parent;
    private listener;
    channel_states: Record<Channel, ChannelState>;
    term_text: Element;
    term_el: HTMLElement;
    constructor(parent: HTMLElement, listener: TerminalListener);
    onclick: (event: MouseEvent) => void;
    line_to_html: (x: string, state: ChannelState, line_class: string) => string;
    after_write(): void;
    term_write(output: string[], channel: Channel): void;
    show_find(): void;
    term_clear(): void;
}
export {};
