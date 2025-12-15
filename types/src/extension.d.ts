import { type Folder } from './data.js';
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
export interface CommandLineClicked {
    command: "command_link_clicked";
    full_pathname: string;
    file: string;
    row: number;
    col: number;
}
export declare function open_file(pos: CommandLineClicked): Promise<void>;
export type WebviewMessage = WebviewMessageSimple | RunnerReport | SetSelected | CommandClicked | CommandLineClicked;
export declare function activate(context: any): void;
export declare function deactivate(): void;
