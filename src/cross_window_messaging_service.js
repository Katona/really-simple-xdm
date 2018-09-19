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
        this.target.postMessage(msg, this.targetOrigin);
    }

    onMessage(callback) {
        this.listeners.push(callback);
    }

    removeMessageListener(callback) {
        this.listeners = this.listeners.filter(listener => listener !== callback);
    }
}

module.exports = CrossWindowMessagingService;
