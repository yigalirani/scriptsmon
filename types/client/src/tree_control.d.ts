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
export interface TreeDataProvider<T> {
    toggle_order: Array<string>;
    convert: (root: T) => TreeNode;
    command: (root: T, id: string, command: string) => MaybePromise<void>;
    selected: (root: T, id: string) => MaybePromise<void>;
    icons_html: string;
    animated: string;
}
export declare class TreeControl<T> {
    private parent;
    private provider;
    private base_uri;
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
    constructor(parent: HTMLElement, provider: TreeDataProvider<T>);
    private create_node;
    render(root: T, base_uri: string): void;
}
