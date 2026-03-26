import { type s2t } from '@yigal/base_types';
import { Terminal, type TerminalListener } from './terminal.js';
import { type Component } from './dom_utils.js';
import type { Runner, RunnerReport } from '../../src/data.js';
declare class TerminalPanel implements TerminalListener {
    last_run_id: number | undefined;
    el: HTMLElement;
    term: Terminal;
    workspace_folder: string;
    constructor(runner: Runner);
    set_visibility(val: boolean): void;
    parse(line_text: string, parse_state: unknown): {
        parser_state: string | undefined;
        ranges: import("./terminal.js").ParseRange[];
    };
    dataset_click(dataset: Record<string, string>): void;
    update_terminal2(report: RunnerReport, runner: Runner): void;
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
