type GroupType = {
    [key: string]: string;
} | undefined;
export declare function parse_group_int(groups: GroupType, name: string): number;
export declare function parse_group_string(match: RegExpMatchArray, name: string): string | undefined;
type font_style = 'bold' | 'italic' | 'faint' | 'underline' | 'blinking' | 'inverse' | 'strikethrough';
export interface Style {
    foreground: string | undefined;
    background: string | undefined;
    font_styles: Set<font_style>;
}
type AnsiCommandType = 'style' | 'insert' | 'style_insert';
interface AnsiCommand {
    position: number;
    command: AnsiCommandType;
}
interface AnsiStyleCommand extends AnsiCommand {
    command: 'style';
    style: Style;
}
export interface AnsiInsertCommand extends AnsiCommand {
    command: 'insert';
    str: string;
}
export interface AnsiStyleInsertCommand extends AnsiCommand {
    command: 'style_insert';
    str: string;
    style: Style;
}
export declare function merge_inserts(a: Array<AnsiInsertCommand>, b: Array<AnsiInsertCommand>): AnsiInsertCommand[];
export declare function merge(a: Array<AnsiCommand>, b: Array<AnsiCommand>): AnsiCommand[];
export declare function generate_html({ style_positions, inserts, plain_text }: {
    inserts: Array<AnsiInsertCommand>;
    style_positions: Array<AnsiStyleCommand>;
    plain_text: string;
}): string;
export declare function strip_ansi(text: string, start_style: Style): {
    plain_text: string;
    style_positions: AnsiStyleCommand[];
    link_inserts: AnsiInsertCommand[];
};
export {};
