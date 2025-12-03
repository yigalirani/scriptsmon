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
    selected: string | undefined;
    last_root: T | undefined;
    last_converted: TreeNode;
    collapsed_id: Set<string>;
    create_node_element(node: TreeNode): HTMLElement;
    constructor(parent: HTMLElement, provider: TreeDataProvider<T>);
    create_node(parent: HTMLElement, node: TreeNode): void;
    render(root: T): void;
}
export {};
