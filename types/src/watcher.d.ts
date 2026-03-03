import type { FullReason } from './data.js';
interface IdRel {
    watch_id: string;
    rel: string;
}
export interface IdRelPath extends IdRel {
    path: string;
}
export declare class Watcher {
    private started;
    private id_to_reason;
    private watched_paths;
    private watch_index;
    private close_watched_path;
    private add_watched_path;
    restart(watch_requests: IdRelPath[]): Promise<void>;
    set_started(id: string): void;
    get_reasons(monitored: Set<string>): {
        full_reason: FullReason;
        runner_id: string;
    }[];
    private get_reason;
    clear_changed(): void;
}
export {};
