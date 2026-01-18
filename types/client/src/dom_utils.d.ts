import type { s2t } from '@yigal/base_types';
export declare function query_selector<T extends Element = Element>(el: Element, selector: string): T;
export declare function create_element(html: string, parent?: HTMLElement): HTMLElement;
export declare function divs(vals: s2t<string | undefined>): string;
export declare function get_parent_by_class(el: Element | null, className: string): HTMLElement | null;
export declare function get_parent_by_classes(el: HTMLElement, className: string | string[]): HTMLElement | null;
export declare const update_child_html: (el: HTMLElement, selector: string, value: string) => void;
export declare const update_class_name: (el: HTMLElement, selector: string, value: string) => void;
export declare class CtrlTracker {
    pressed: boolean;
    constructor();
}
export declare function path_join(...segments: string[]): string;
interface VSCodeApi {
    postMessage(message: unknown): void;
    getState(): unknown;
    setState(state: unknown): void;
}
export declare const vscode: VSCodeApi;
export declare const ctrl: CtrlTracker;
export {};
