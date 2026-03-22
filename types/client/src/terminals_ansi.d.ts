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
export declare function generate_html({ style_positions, replacments, plain_text }: {
    replacments: Array<AnsiInsertCommand>;
    style_positions: Array<AnsiStyleCommand>;
    plain_text: string;
}): string;
export declare function strip_ansi(text: string, start_style: Style): {
    plain_text: string;
    style_positions: AnsiStyleCommand[];
};
export {};
