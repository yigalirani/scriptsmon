export declare function parseIcons(html: string): Record<string, string>;
interface IconVersion {
    icon: string;
    version: number;
}
export declare class Icons {
    icons_html: string;
    icons: Record<string, string>;
    id_changed: Record<string, number>;
    icon_versions: Record<string, IconVersion>;
    constructor(icons_html: string);
    set_icon_version(id: string, icon: string, version: number): void;
    animate(): void;
}
export {};
