type font_style = 'normal' | 'bold' | 'italic' | 'underline' | 'blinking' | 'inverse' | 'strikethrough';
export interface Style {
    foreground: string | undefined;
    background: string | undefined;
    font_styles: Set<font_style>;
}
interface StylePosition extends Style {
    position: number;
}
export interface Replacement {
    pos: number;
    str: string;
}
export declare function generate_html({ style_positions, replacments, plain_text }: {
    replacments: Array<Replacement>;
    style_positions: Array<StylePosition>;
    plain_text: string;
}): string;
export declare function strip_ansi(text: string, start_style: Style): {
    plain_text: string;
    style_positions: StylePosition[];
};
export {};
