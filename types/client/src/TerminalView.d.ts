import type { Runner } from '../../src/data.js';
import type { RunnerReport } from '../../src/monitor.js';
import type { FileLocation } from './index.js';
import type { Pos } from '../../src/vscode_utils.js';
import { CtrlTracker } from './dom_utils.js';
interface TerminalPanelProps {
    runner: Runner;
    report: RunnerReport;
    workspaceFolder: string;
    onFileLocationClick: (location: FileLocation) => void;
    onPosClick: (pos: Pos) => void;
    ctrlTracker: CtrlTracker;
}
export declare function TerminalPanel({ runner, report, workspaceFolder, onFileLocationClick, onPosClick, ctrlTracker, }: TerminalPanelProps): import("react/jsx-runtime").JSX.Element;
interface TerminalsViewProps {
    report: RunnerReport;
    workspaceFolder: string;
    onFileLocationClick: (location: FileLocation) => void;
    onPosClick: (pos: Pos) => void;
    ctrlTracker: CtrlTracker;
    selectedRunnerId: string | null;
}
export declare function TerminalsView({ report, workspaceFolder, onFileLocationClick, onPosClick, ctrlTracker, selectedRunnerId, }: TerminalsViewProps): import("react/jsx-runtime").JSX.Element;
export {};
