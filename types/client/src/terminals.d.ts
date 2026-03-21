import { type s2t } from '@yigal/base_types';
import { type Component } from './dom_utils.js';
import type { Runner, RunnerReport } from '../../src/data.js';
import { type Style } from './terminals_ansi.js';
type Channel = 'stderr' | 'stdout';
type ChannelState = {
    last_line: string;
    ancore: string | undefined;
    style: Style;
};
declare class TerminalPanel {
    last_run_id: number | undefined;
    el: HTMLElement;
    term_el: Element;
    channel_states: Record<Channel, ChannelState>;
    constructor(runner: Runner);
    set_visibility(val: boolean): void;
    term_clear(): void;
    line_to_html: (x: string, state: ChannelState, line_class: string) => string;
    term_write(output: string[], channel: Channel): void;
    update_terminal(report: RunnerReport, runner: Runner): void;
}
export declare class Terminals implements Component {
    terminals: s2t<TerminalPanel>;
    get_terminal(runner: Runner): TerminalPanel;
    on_interval(): void;
    on_data(data: unknown): void;
    set_selected(id: string): void;
}
export {};
