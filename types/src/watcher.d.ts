export declare class Watcher {
    changed: Record<string, string[]>;
    add(watch_id: string, path: string): void;
    unchnaged(watch_id: string): boolean;
    has(k: string): boolean;
    has_changed(watch_id: string): boolean;
    get_changed(watch_id: string): string[];
    clear(k: string): void;
    clear_watching(): void;
}
