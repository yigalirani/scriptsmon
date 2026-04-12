import { type Style } from './terminals_ansi.js';
import { TerminalSearch, type SearchData } from './terminal_search.js';
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
    parser_state: unknown;
    style: Style;
    class_name: string;
}
export declare class Terminal implements SearchData {
    private listener;
    channel_states: Record<Channel, ChannelState>;
    term_text: HTMLElement;
    term_el: HTMLElement;
    search: TerminalSearch;
    highlight: Highlight;
    term_plain_text: string;
    lines: BigInt64Array<ArrayBuffer>;
    last_line: string;
    last_write_channel: Channel;
    constructor(parent: HTMLElement, listener: TerminalListener, id: string);
    make_highlight(id: string): Highlight;
    onclick: (event: MouseEvent) => void;
    line_to_html: (x: string, state: ChannelState, update_state: boolean) => string;
    after_write(): void;
    term_write(output: string[], channel: Channel): void;
    show_find(): void;
    term_clear(): void;
}
export {};
