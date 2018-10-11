class CallbackRegistry {
    constructor() {
        this.callbacks = [];
    }

    getId(callbackFn) {
        const callback = this.callbacks.filter(callback => callback.fn === callbackFn);
        return callback.length === 1 ? callback[0].id : undefined;
    }

    registerCallbacks(newCallbacks) {
        this.callbacks.push(...newCallbacks);
    }

    getCallbackFunction(id) {
        const callback = this.callbacks.filter(callback => callback.id === id);
        return callback.length === 1 ? callback[0].fn : undefined;
    }

    deleteCallback(id) {
        delete this.callbacks[id];
    }
}

module.exports = CallbackRegistry;
