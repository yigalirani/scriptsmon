declare namespace _default {
    let rules: {
        "layered-methods": {
            meta: {
                type: string;
                docs: {
                    description: string;
                };
                messages: {
                    definedAfter: string;
                };
            };
            create(context: any): {
                ClassBody(node: any): void;
            };
        };
    };
}
export default _default;
