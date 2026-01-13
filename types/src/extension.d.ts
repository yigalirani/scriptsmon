import { type RunnerReport } from './monitor.js';
import * as vscode from 'vscode';
import { type CommandOpenFileRowCol, type CommandOpenFilePos } from './vscode_utils.js';
export interface WebviewMessageSimple {
    command: "buttonClick" | "updateContent" | "get_report";
    text?: string;
}
export interface SetSelectedCommand {
    command: "set_selected_command";
    selected: string;
}
export interface CommandClicked {
    command: "command_clicked";
    id: string;
    command_name: string;
}
export type WebviewMessage = WebviewMessageSimple | RunnerReport | SetSelectedCommand | CommandClicked | CommandOpenFileRowCol | CommandOpenFilePos;
export declare function activate(context: vscode.ExtensionContext): Promise<void>;
export declare function deactivate(): void;
