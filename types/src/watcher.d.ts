import * as chokidar from 'chokidar';
import { type FullReason } from './data.js';
interface IdRel {
    watch_id: string;
    rel: string;
}
export declare class Watcher {
    started: Set<string>;
    id_to_reason: Record<string, FullReason>;
    id_to_watching_path: Record<string, Set<string>>;
    watching_path_to_id: Record<string, Set<IdRel>>;
    watchers: Set<chokidar.FSWatcher>;
    add_watch(watch_id: string, path: string, rel: string): void;
    start_watching(): void;
    stop_watching(): Promise<void>;
    initial_or_changed(watch_id: string): boolean;
    set_started(id: string): void;
    get_reasons(monitored: Set<string>): {
        full_reason: FullReason;
        runner_id: string;
    }[];
    get_reason(watch_id: string): FullReason | undefined;
    clear_changed(): void;
}
export {};
