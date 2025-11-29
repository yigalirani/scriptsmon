import { type Runner, type Folder } from './monitor.js';
import * as vscode from 'vscode';
type MonitorNode = Runner | Folder;
export interface WebviewMessage {
    command: "buttonClick" | "updateContent";
    text?: string;
}
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
