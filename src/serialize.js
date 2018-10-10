function serializeArgs(args, callbackRegistry) {
    return args.map(arg => {
        return {
            type: typeof arg,
            value: typeof arg === "function" ? callbackRegistry.getId(arg) : arg
        };
    });
}

module.exports = serializeArgs;
