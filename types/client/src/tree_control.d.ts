import type { s2s } from '@yigal/base_types';
type MaybePromise<T> = T | Promise<T>;
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
    checkbox_state: boolean | undefined;
    default_checkbox_state: boolean | undefined;
}
export interface TreeDataProvider<T> {
    convert: (root: T) => TreeNode;
    command: (root: T, id: string, command: string) => MaybePromise<void>;
    selected: (root: T, id: string) => MaybePromise<void>;
    icons_html: string;
    animated: string;
}
export declare class TreeControl<T> {
    parent: HTMLElement;
    provider: TreeDataProvider<T>;
    base_uri: string;
    icons: s2s;
    root: T | undefined;
    id_last_changed: Record<string, number>;
    collapsed: Set<string>;
    selected_id: string;
    converted: TreeNode | undefined;
    id_to_class: Record<string, string>;
    calc_node_class(node: TreeNode): string;
    apply_classes(): void;
    create_node_element(node: TreeNode, margin: number, parent?: HTMLElement): HTMLElement;
    set_selected(el: HTMLElement): Promise<void>;
    command_clicked(evt: Event): boolean;
    mark_changed(id: string): void;
    constructor(parent: HTMLElement, provider: TreeDataProvider<T>);
    create_node(parent: HTMLElement, node: TreeNode, depth: number): void;
    render(root: T, base_uri: string): void;
}
export {};
