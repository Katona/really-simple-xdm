const stringify = require("json-stringify-safe");
const serializeError = require("serialize-error");
const EventEmitter = require("events");

const MESSAGE_EVENT = "message";
const INVALID_MESSAGE_EVENT = "invalidMessage";

class CrossWindowMessagingService {
    constructor(target, targetOrigin, _window = window) {
        this.eventEmitter = new EventEmitter();
        this.targetOrigin = targetOrigin;
        this.target = target;
        _window.addEventListener("message", e => {
            if (this.targetOrigin === "*" || e.origin === this.targetOrigin) {
                this.eventEmitter.emit(MESSAGE_EVENT, e.data);
            } else {
                this.eventEmitter.emit(INVALID_MESSAGE_EVENT, e);
            }
        });
    }

    sendMessage(msg) {
        // Send the message through a stringify/parse loop so that 'postMessage' can clone it.
        const msgClone = JSON.parse(stringify(msg, this.replacer.bind(this)));
        this.target.postMessage(msgClone, this.targetOrigin);
    }

    replacer(key, value) {
        if (value && value.stack && value.message) {
            return serializeError(value);
        }
        return value;
    }

    onMessage(callback) {
        this.eventEmitter.on(MESSAGE_EVENT, callback);
    }

    removeMessageListener(callback) {
        this.eventEmitter.removeListener(MESSAGE_EVENT, callback);
    }

    onInvalidMessage(callback) {
        this.eventEmitter.on(INVALID_MESSAGE_EVENT, callback);
    }

    removeInvalidMessageListener(callback) {
        this.eventEmitter.removeListener(INVALID_MESSAGE_EVENT, callback);
    }
}

module.exports = CrossWindowMessagingService;
