export declare class Watcher {
    add(k: string, path: string): void;
    unchnaged(k: string): boolean;
    has(k: string): boolean;
    has_changed(k: string): boolean;
    get_changed(k: string): string[];
    clear(k: string): void;
    stop_watching(): void;
}
