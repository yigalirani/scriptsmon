import { type s2t } from '@yigal/base_types';
import { Terminal } from '@xterm/xterm';
import { type Component } from './dom_utils.js';
import type { Runner, RunnerReport } from '../../src/data.js';
declare class TerminalPanel {
    last_run_id: number | undefined;
    el: HTMLElement;
    term: Terminal | undefined;
    clearAnchors: () => void;
    constructor(runner: Runner);
    set_visibility(visibility: boolean): void;
    create_if_needed(runner: Runner): Terminal;
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
