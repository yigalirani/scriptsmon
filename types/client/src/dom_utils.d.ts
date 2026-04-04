import type { s2t } from '@yigal/base_types';
export declare function query_selector<T extends Element = Element>(el: Element, selector: string): T;
export declare function create_element(html: string, parent?: HTMLElement): HTMLElement;
export declare function divs(vals: s2t<string | undefined>): string;
export declare function get_parent_by_data_attibute(el: HTMLElement | null, key: string): HTMLElement | null;
export declare function get_parent_with_dataset(el: HTMLElement | null): HTMLElement | null;
export declare function get_parent_by_class(el: Element | null, className: string): HTMLElement | null;
export declare function has_class(parent: HTMLElement, selector: string, c: string): boolean;
export declare function get_parent_by_classes(el: HTMLElement, className: string | string[]): HTMLElement | null;
export declare function get_parent_id(//loops over parents until first with id
el: HTMLElement): string | undefined;
export declare const update_child_html: (el: HTMLElement, selector: string, value: string) => void;
export declare const update_class_name: (el: HTMLElement, selector: string, value: string) => void;
export declare class CtrlTracker {
    pressed: boolean;
    constructor();
}
interface VSCodeApi {
    postMessage(message: unknown): void;
    getState(): unknown;
    setState(state: unknown): void;
}
export declare const vscode: VSCodeApi;
export interface Component {
    on_interval: () => void;
    on_data: (data: unknown) => void;
}
export declare const ctrl: CtrlTracker;
export declare const re: (flags?: string) => (strings: TemplateStringsArray, ...values: unknown[]) => RegExp;
export {};
