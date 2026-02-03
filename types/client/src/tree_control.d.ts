import { type s2s } from '@yigal/base_types';
import { type Component } from './dom_utils.js';
import { type TreeNode, type TreeDataProvider } from './tree_internals.js';
export type { TreeDataProvider, TreeNode };
export declare class TreeControl implements Component {
    private parent;
    private provider;
    private icons;
    private root;
    private collapsed;
    private selected_id;
    private converted;
    private calc_node_class;
    on_interval(): void;
    private create_node_element;
    private set_selected;
    private command_clicked;
    constructor(parent: HTMLElement, provider: TreeDataProvider, icons: s2s);
    private create_node;
    private big_render;
    on_data(root: unknown): void;
}
