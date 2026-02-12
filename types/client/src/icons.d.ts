import type { TreeNode } from './tree_internals.js';
export declare function parse_icons(html: string): Record<string, string>;
export declare class IconsAnimator {
    icons: Record<string, string>;
    private id_changed;
    private icon_versions;
    constructor(icons: Record<string, string>);
    private set_icon_version;
    private update_icons;
    animate(tree_node: TreeNode): void;
}
