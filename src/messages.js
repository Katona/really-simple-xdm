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

    deleteCallback(callbackId) {
        let msg = {
            type: "DELETE_CALLBACK",
            id: uuid.v4(),
            recipient: this.recipient,
            callbackId
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
