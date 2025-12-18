import { s2t } from '@yigal/base_types';
export declare function query_selector<T extends Element = Element>(el: Element, selector: string): T;
export declare function create_element(html: string, parent?: HTMLElement): HTMLElement;
export declare function divs(vals: s2t<string | undefined>): string;
export declare function get_parent_by_class(el: Element | null, className: string): Element | null;
export declare function get_parent_by_classes(el: HTMLElement, className: string | string[]): HTMLElement | null;
export declare function remove_class(el: HTMLElement, className: string): void;
export declare function update_child_html(el: HTMLElement, selector: string, html: string): void;
export declare function reset_animation(ids: Set<string>): void;
export declare class CtrlTracker {
    pressed: boolean;
    constructor();
}
