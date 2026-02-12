import type { MaybePromise } from '@yigal/base_types';
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
    command: (id: string, command_name: string) => MaybePromise<void>;
    selected: (id: string) => MaybePromise<void>;
    icons_html: string;
}
export declare function need_full_render(root: TreeNode, old_root: TreeNode | undefined): boolean;
export declare function element_for_up_arrow(selected: HTMLElement): HTMLElement | null;
export declare function element_for_down_arrow(selected: HTMLElement): HTMLElement | null;
