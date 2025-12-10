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
export type WebviewMessage = WebviewMessageSimple | RunnerReport | SetSelected | CommandClicked;
export declare function activate(context: vscode.ExtensionContext): void;
export declare function deactivate(): void;
