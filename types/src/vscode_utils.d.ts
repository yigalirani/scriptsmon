import { type WebviewView, type Webview, type ExtensionContext } from 'vscode';
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
export declare function getWebviewContent(context: ExtensionContext, webview: Webview): string;
export type WebviewFunc = (webview: WebviewView, context: ExtensionContext) => Promise<void> | void;
export declare function define_webview({ context, id, html, f }: {
    context: ExtensionContext;
    id: string;
    html: string;
    f?: WebviewFunc;
}): void;
export declare function register_command(context: ExtensionContext, command: string, commandHandler: () => void): void;
export declare function open_file_row_col(pos: CommandOpenFileRowCol): Promise<void>;
export declare function open_file(pos: CommandOpenFileRowCol | CommandOpenFileStartEnd): Promise<void>;
