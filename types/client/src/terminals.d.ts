import type { RunnerReport } from '../../src/monitor.js';
export declare function make_terminals(): {
    render(report: RunnerReport): void;
    set_selected(id: string): void;
};
