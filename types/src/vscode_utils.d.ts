import { type WebviewView, type Webview, type ExtensionContext } from 'vscode';
export interface Pos {
    source_file: string;
    start?: number;
    end?: number;
}
export interface CommandOpenFileRowCol {
    command: "command_open_file_rowcol";
    source_file: string;
    row: number;
    col: number;
}
export interface CommandOpenFilePos {
    command: "command_open_file_pos";
    pos: Pos;
}
export declare function get_webview_content(context: ExtensionContext, webview: Webview, html_filename: string): string;
export type WebviewFunc = (webview: WebviewView, context: ExtensionContext) => Promise<void> | void;
export declare function define_webview({ context, id, html_filename, f }: {
    context: ExtensionContext;
    id: string;
    html_filename: string;
    f?: WebviewFunc;
}): void;
export declare function register_command(context: ExtensionContext, command: string, commandHandler: () => void): void;
export declare function open_file_row_col(pos: CommandOpenFileRowCol): Promise<void>;
export declare function open_file(pos: CommandOpenFileRowCol | CommandOpenFilePos): Promise<void>;
