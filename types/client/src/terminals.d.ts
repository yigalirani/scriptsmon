import { type s2t } from '@yigal/base_types';
import { Terminal, type IMarker } from '@xterm/xterm';
import { WebglAddon } from '@xterm/addon-webgl';
import { type Component } from './dom_utils.js';
import type { Runner, RunnerReport } from '../../src/data.js';
declare class TerminalPanel {
    last_run_id: number | undefined;
    el: HTMLElement;
    term: Terminal | undefined;
    webgl_addon: WebglAddon | undefined;
    num_scrolls: number;
    newViewportY: number;
    marker: IMarker | undefined;
    dispose_count: number;
    clearAnchors: () => void;
    constructor(runner: Runner);
    webgl_on(): void;
    set_visibility(val: boolean): void;
    read_line(i: number): string;
    on_marker_dispose: () => void;
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
