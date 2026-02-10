import { type TreeNode, type TreeDataProvider } from './tree_internals.js';
export type { TreeDataProvider, TreeNode };
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
