const stringify = require("json-stringify-safe");
const serializeError = require("serialize-error");

class CrossWindowMessagingService {
    constructor(target, targetOrigin, _window = window) {
        this.listeners = [];
        this.targetOrigin = targetOrigin;
        this.target = target;
        _window.addEventListener("message", e => {
            if (this.targetOrigin === "*" || e.origin === this.targetOrigin) {
                this.listeners.forEach(l => {
                    l(e.data);
                });
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
        this.listeners.push(callback);
    }

    removeMessageListener(callback) {
        this.listeners = this.listeners.filter(listener => listener !== callback);
    }
}

module.exports = CrossWindowMessagingService;
