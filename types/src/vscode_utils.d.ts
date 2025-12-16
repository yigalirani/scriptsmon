import { WebviewView, Webview, ExtensionContext } from 'vscode';
export declare function getWebviewContent(context: ExtensionContext, webview: Webview): string;
export type WebviewFunc = (webview: WebviewView, context: ExtensionContext) => Promise<void> | void;
export declare function define_webview({ context, id, html, f }: {
    context: ExtensionContext;
    id: string;
    html: string;
    f?: WebviewFunc;
}): void;
export declare function register_command(context: ExtensionContext, command: string, commandHandler: () => void): void;
