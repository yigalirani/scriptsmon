export declare function re(flags?: string): (strings: TemplateStringsArray, ...values: any[]) => RegExp;
export declare function capture(name: string): (...content: string[]) => string;
export declare function neg_lookahead(...pat: string[]): string;
export declare function neg_lookbehind(...pat: string[]): string;
export declare function seq(...pat: string[]): string;
export declare function group(...pat: string[]): string;
export declare function or(...pat: string[]): string;
export declare function make_re(flags: string): (...pat: string[]) => RegExp;
export declare const r: (template: {
    raw: readonly string[] | ArrayLike<string>;
}, ...substitutions: any[]) => string;
export declare const digits: string;
