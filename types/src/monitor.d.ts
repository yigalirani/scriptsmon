import { IPty } from "@homebridge/node-pty-prebuilt-multiarch";
import { Runner, Folder } from './data.js';
export declare function extract_base(folder: Folder): Folder;
interface RunnerCtrl {
    ipty: Record<string, IPty>;
}
export declare function make_runner_ctrl(): {
    ipty: {};
};
export declare function run_runner({ //this is not async function on purpuse
runner, reason, runner_ctrl }: {
    runner: Runner;
    reason: string;
    runner_ctrl: RunnerCtrl;
}): Promise<void>;
export declare function read_package_json(full_pathnames: string[]): Promise<Folder>;
export {};
