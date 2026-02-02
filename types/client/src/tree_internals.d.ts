import type { s2t, MaybePromise } from '@yigal/base_types';
export interface TreeNode {
    type: 'item' | 'folder';
    label: string;
    id: string;
    icon: string;
    className: string | undefined;
    description?: string;
    commands: string[];
    children: TreeNode[];
    icon_version: number;
    toggles: Record<string, boolean | "missing">;
    tags: string[];
}
export interface TreeDataProvider {
    toggle_order: Array<string>;
    convert: (root: unknown) => TreeNode;
    command: (root: unknown, id: string, command: string) => MaybePromise<void>;
    selected: (root: unknown, id: string) => MaybePromise<void>;
    icons_html: string;
    animated: string;
}
export declare function parseIcons(html: string): Record<string, string>;
export declare function calc_changed(root: TreeNode, old_root: TreeNode | undefined): {
    versions: Set<string>;
    icons: Set<string>;
    big: boolean;
    new_index: s2t<TreeNode>;
};
export declare function element_for_up_arrow(selected: HTMLElement): HTMLElement | null;
export declare function element_for_down_arrow(selected: HTMLElement): HTMLElement | null;
