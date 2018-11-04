function serializeArgs(args, callbackRegistry) {
    return args.map(arg => {
        return {
            type: typeof arg,
            value: typeof arg === "function" ? callbackRegistry.getId(arg) : arg
        };
    });
}

function deserializeArgs(args, callbackRegistry) {
    return args.map(arg => {
        return arg.type === "function" ? callbackRegistry.getCallbackFunction(arg.value) : arg.value;
    });
}

module.exports.serializeArgs = serializeArgs;
module.exports.deserializeArgs = deserializeArgs;
