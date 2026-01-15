import type { TreeDataProvider } from './tree_control.js';
interface TreeViewProps<T> {
    provider: TreeDataProvider<T>;
    root: T | undefined;
    baseUri: string;
    onSelect?: (id: string) => void;
    selectedId?: string | null;
}
export declare function TreeView<T>({ provider, root, baseUri, onSelect, selectedId: externalSelectedId }: TreeViewProps<T>): import("react/jsx-runtime").JSX.Element;
export {};
