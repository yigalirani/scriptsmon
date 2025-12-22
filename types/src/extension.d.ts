import { type Folder } from './data.js';
import * as vscode from 'vscode';
export interface WebviewMessageSimple {
    command: "buttonClick" | "updateContent" | "get_report";
    text?: string;
}
export interface RunnerReport {
    command: "RunnerReport";
    root: Folder;
    base_uri: string;
}
export interface SetSelected {
    command: "set_selected";
    selected: string;
}
export interface CommandClicked {
    command: "command_clicked";
    id: string;
    command_name: string;
}
export interface CommandOpenFileRowCol {
    command: "command_open_file_rowcol";
    full_pathname: string;
    file?: string;
    row: number;
    col: number;
}
export interface CommandOpenFileStartEnd {
    command: "command_open_file_start_end";
    full_pathname: string;
    file?: string;
    start: number;
    end: number;
}
export declare function open_file(pos: CommandOpenFileRowCol): Promise<void>;
export declare function open_file2(pos: CommandOpenFileStartEnd): Promise<void>;
export type WebviewMessage = WebviewMessageSimple | RunnerReport | SetSelected | CommandClicked | CommandOpenFileRowCol | CommandOpenFileStartEnd;
export declare function activate(context: vscode.ExtensionContext): Promise<void>;
export declare function deactivate(): void;
