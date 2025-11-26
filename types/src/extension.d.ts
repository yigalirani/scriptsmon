import { type Runner, type Folder } from './monitor.js';
import * as vscode from 'vscode';
type MonitorNode = Runner | Folder;
export declare class MonitorProvider implements vscode.TreeDataProvider<MonitorNode> {
    root: Folder;
    constructor(root: Folder);
    getTreeItem(element: MonitorNode): vscode.TreeItem;
    getChildren(element?: MonitorNode): Thenable<MonitorNode[]>;
}
export declare function activate(context: vscode.ExtensionContext): Promise<void>;
export declare function deactivate(): void;
export {};
