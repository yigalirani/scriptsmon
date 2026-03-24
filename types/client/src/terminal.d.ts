import { type Style } from './terminals_ansi.js';
export interface ParseRange {
    start: number;
    end: number;
    values: Record<string, string>;
}
export interface TerminalListener {
    parse: (line_text: string, state: unknown) => {
        parser_state: unknown;
        ranges: Array<ParseRange>;
    };
    click: (values: Record<string, string>) => void;
}
type Channel = 'stderr' | 'stdout';
interface ChannelState {
    last_line: string;
    parser_state: unknown;
    style: Style;
}
export declare class Terminal {
    private term_el;
    private listener;
    channel_states: Record<Channel, ChannelState>;
    constructor(term_el: HTMLElement, listener: TerminalListener);
    line_to_html: (x: string, state: ChannelState, line_class: string) => string;
    after_write(): void;
    term_write(output: string[], channel: Channel): void;
    term_clear(): void;
}
export {};
