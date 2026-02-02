import { type MaybePromise } from '@yigal/base_types';
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
export declare class TreeControl {
    private parent;
    private provider;
    private icons;
    private root;
    private id_last_changed;
    private collapsed;
    private selected_id;
    private converted;
    private calc_node_class;
    private apply_classes;
    private create_node_element;
    private set_selected;
    private command_clicked;
    private mark_changed;
    constructor(parent: HTMLElement, provider: TreeDataProvider);
    private create_node;
    render(root: unknown, _base_uri: string): void;
}
