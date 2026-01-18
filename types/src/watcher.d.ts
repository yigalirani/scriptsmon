import * as chokidar from 'chokidar';
export declare class Watcher {
    started: Set<string>;
    id_to_changed_path: Record<string, Set<string>>;
    id_to_watching_path: Record<string, Set<string>>;
    watching_path_to_id: Record<string, Set<string>>;
    watchers: Set<chokidar.FSWatcher>;
    add_watch(watch_id: string, path: string): void;
    start_watching(): void;
    stop_watching(): Promise<void>;
    initial_or_changed(watch_id: string): boolean;
    private get_reason;
    get_reasons(monitored: Set<string>): {
        runner_id: string;
        reason: string;
    }[];
    get_changed(watch_id: string): string[];
    clear_changed(): void;
}
