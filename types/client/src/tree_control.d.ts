type MaybePromise<T> = T | Promise<T>;
export declare function query_selector(el: HTMLElement, selector: string): HTMLElement;
export interface TreeNode {
    type: 'item' | 'folder';
    label: string;
    id: string;
    icon?: string;
    description?: string;
    commands: string[];
    children: TreeNode[];
}
export interface TreeDataProvider<T> {
    convert: (root: T) => TreeNode;
    command: (item: T, command: string) => MaybePromise<void>;
}
export declare class TreeControl<T> {
    parent: HTMLElement;
    provider: TreeDataProvider<T>;
    base_uri: string;
    last_root: T | undefined;
    last_converted: TreeNode;
    create_node_element(node: TreeNode, margin: number, parent?: HTMLElement): HTMLElement;
    constructor(parent: HTMLElement, provider: TreeDataProvider<T>);
    create_node(parent: HTMLElement, node: TreeNode, depth: number): void;
    render(root: T, base_uri: string): void;
}
export {};
