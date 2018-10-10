let uuid = require("uuid");

class Messages {
    constructor(recipient) {
        this.recipient = recipient;
    }

    functionCall(functionName, args) {
        return {
            type: "FUNCTION_CALL",
            id: uuid.v4(),
            recipient: this.recipient,
            functionName,
            args
        };
    }

    callbackRegistration(functionName, callbackId, args) {
        const argDescriptors = args.map(arg => {
            return {
                type: typeof arg,
                value: typeof arg === "function" ? callbackId : arg
            };
        });
        let msg = {
            type: "CALLBACK_REGISTRATION",
            id: uuid.v4(),
            recipient: this.recipient,
            functionName,
            args: argDescriptors
        };
        return msg;
    }

    callbackDeregistration(functionName, registerFunctionName, callbackId, args) {
        const argDescriptors = args.map(arg => {
            return {
                type: typeof arg,
                value: typeof arg === "function" ? callbackId : arg
            };
        });
        let msg = {
            type: "CALLBACK_DEREGISTRATION",
            id: uuid.v4(),
            recipient: this.recipient,
            functionName,
            registerFunctionName,
            args: argDescriptors
        };
        return msg;
    }

    returnValue(id, value) {
        return { type: "RETURN_VALUE", id, recipient: this.recipient, value };
    }

    error(id, error, functionName) {
        return { type: "ERROR", id, recipient: this.recipient, error, functionName };
    }

    callback(id, ...args) {
        return { type: "CALLBACK", id, recipient: this.recipient, args };
    }

    ping() {
        return { type: "PING", id: uuid.v4(), recipient: this.recipient };
    }

    pong(id) {
        return { type: "PONG", id, recipient: this.recipient };
    }
}

module.exports = Messages;
