import { s2s } from '@yigal/base_types';
type MaybePromise<T> = T | Promise<T>;
export declare function query_selector<T extends Element = Element>(el: Element, selector: string): T;
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
}
export interface TreeDataProvider<T> {
    convert: (root: T) => TreeNode;
    command: (id: string, command: string) => MaybePromise<void>;
    icons_html: string;
}
export declare function create_element(html: string, parent?: HTMLElement): HTMLElement;
export declare class TreeControl<T> {
    parent: HTMLElement;
    provider: TreeDataProvider<T>;
    base_uri: string;
    icons: s2s;
    last_converted: TreeNode | undefined;
    create_node_element(node: TreeNode, margin: number, parent?: HTMLElement): HTMLElement;
    on_selected_changed: (a: string) => MaybePromise<void>;
    set_selected(el: HTMLElement): Promise<void>;
    command_clicked(evt: Event): boolean;
    constructor(parent: HTMLElement, provider: TreeDataProvider<T>);
    create_node(parent: HTMLElement, node: TreeNode, depth: number): void;
    render(root: T, base_uri: string): void;
}
export {};
