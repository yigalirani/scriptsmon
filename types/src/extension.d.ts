import { FolderRunner, type Runner, type Folder, type RunnerBase, runner_base_keys, FolderBase } from './monitor.js';
import * as vscode from 'vscode';
export { type RunnerBase, runner_base_keys, FolderBase, FolderRunner };
type MonitorNode = Runner | Folder;
export interface WebviewMessageSimple {
    command: "buttonClick" | "updateContent" | "get_report";
    text?: string;
}
export interface RunnerReport {
    command: "RunnerReport";
    root: FolderBase;
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
declare class IconPaths {
    context: vscode.ExtensionContext;
    changed: vscode.EventEmitter<undefined>;
    folderIconPath: vscode.Uri | undefined;
    fileIconPath: vscode.Uri | undefined;
    constructor(context: vscode.ExtensionContext, changed: vscode.EventEmitter<undefined>);
    calc_paths(): void;
}
export declare class MonitorProvider implements vscode.TreeDataProvider<MonitorNode> {
    root: Folder;
    paths: IconPaths;
    changed: vscode.EventEmitter<undefined>;
    onDidChangeTreeData: vscode.Event<undefined>;
    constructor(root: Folder, context: vscode.ExtensionContext);
    getTreeItem(element: MonitorNode): vscode.TreeItem;
    getChildren(element?: MonitorNode): Thenable<MonitorNode[]>;
}
export declare function activate(context: vscode.ExtensionContext): Promise<void>;
export declare function deactivate(): void;
