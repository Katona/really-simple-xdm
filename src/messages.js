let uuid = require("uuid");

function functionCall(functionName, args) {
    const argDescriptors = args.map(arg => ({
        type: typeof arg,
        value: arg
    }));
    return {
        type: "FUNCTION_CALL",
        id: uuid.v4(),
        functionName,
        args: argDescriptors
    };
}

function callbackRegistration(functionName, callbackId, args) {
    const argDescriptors = args.map(arg => {
        return {
            type: typeof arg,
            value: typeof arg === "function" ? callbackId : arg
        };
    });
    let msg = {
        type: "CALLBACK_REGISTRATION",
        id: uuid.v4(),
        functionName,
        args: argDescriptors
    };
    return msg;
}

function createCallbackDeregistrationMessage(functionName, registerFunctionName, callbackId, args) {
    const argDescriptors = args.map(arg => {
        return {
            type: typeof arg,
            value: typeof arg === "function" ? callbackId : arg
        };
    });
    let msg = {
        type: "CALLBACK_DEREGISTRATION",
        id: uuid.v4(),
        functionName,
        registerFunctionName,
        args: argDescriptors
    };
    return msg;
}

function returnValue(id, value) {
    return { type: "RETURN_VALUE", id, value };
}

function error(id, error, functionName) {
    return { type: "ERROR", id, error, functionName };
}

function callback(id, ...args) {
    return { type: "CALLBACK", id, args };
}

function ping() {
    return { type: "PING", id: uuid.v4() };
}

function pong(id) {
    return { type: "PONG", id };
}

module.exports.functionCall = functionCall;
module.exports.callbackRegistration = callbackRegistration;
module.exports.createCallbackDeregistrationMessage = createCallbackDeregistrationMessage;
module.exports.returnValue = returnValue;
module.exports.error = error;
module.exports.callback = callback;
module.exports.ping = ping;
module.exports.pong = pong;
