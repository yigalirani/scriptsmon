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
    private parent;
    private provider;
    private base_uri;
    private icons;
    private root;
    private id_last_changed;
    private collapsed;
    private selected_id;
    private converted;
    private id_to_class;
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
export {};
