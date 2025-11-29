import { type Runner, type Folder, type RunnerBase } from './monitor.js';
import * as vscode from 'vscode';
type MonitorNode = Runner | Folder;
export interface WebviewMessageSimple {
    command: "buttonClick" | "updateContent" | "get_report";
    text?: string;
}
export interface RunnerReport {
    command: "RunnerReport";
    runners: RunnerBase[];
}
export type WebviewMessage = WebviewMessageSimple | RunnerReport;
export declare class MonitorProvider implements vscode.TreeDataProvider<MonitorNode> {
    root: Folder;
    private folderIconPath;
    private fileIconPath;
    private context;
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<MonitorNode | undefined | null | void>;
    constructor(root: Folder, context: vscode.ExtensionContext);
    private updateIcons;
    getTreeItem(element: MonitorNode): vscode.TreeItem;
    getChildren(element?: MonitorNode): Thenable<MonitorNode[]>;
}
export declare function activate(context: vscode.ExtensionContext): Promise<void>;
export declare function deactivate(): void;
export {};
