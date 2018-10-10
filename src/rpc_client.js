let uuid = require("uuid");
let Messages = require("./messages");
let CallbackRegistrationHandler = require("./callback_registration_handler");
let serializeArgs = require("./serialize").serializeArgs;

function assertCallbackCountIs(obj, count) {
    const fnCount = obj.reduce((fnCount, obj) => fnCount + (typeof obj === "function" ? 1 : 0), 0);
    if (fnCount !== count) throw new Error(`Allowed number of callback functions is ${count}, received ${fnCount}.`);
}

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

class RpcClientHandler {
    constructor(messagingBackend, config) {
        this.messages = config.messages;
        this.callbackRegistry = new CallbackRegistry();
        this.messagingBackend = messagingBackend;
        this.messagingBackend.onMessage(this.handleCallbackResponse.bind(this));
    }

    get(target, propKey) {
        return this.handleFunctionCall(target, propKey);
    }

    handleFunctionCall(target, functionName) {
        // TODO: we have to prevent 'then' calls, otherwise some code assumes that this is a Promise
        if (functionName === "then") {
            return;
        }
        return (...args) => {
            const newFunctions = args
                .filter(a => typeof a === "function")
                .filter(a => this.callbackRegistry.getId(a) === undefined)
                .map(a => ({ fn: a, id: uuid.v4() }));
            this.callbackRegistry.registerCallbacks(newFunctions);
            const serializedArgs = serializeArgs(args, this.callbackRegistry);
            let msg = this.messages.functionCall(functionName, serializedArgs);
            const resultPromise = this.createResult(msg);
            this.messagingBackend.sendMessage(msg);
            return resultPromise;
        };
    }

    createResult(originalMessage) {
        return new Promise((resolve, reject) => {
            const responseListener = response => {
                if (response.id !== originalMessage.id) {
                    return;
                }
                this.messagingBackend.removeMessageListener(responseListener);
                if (response.type === "RETURN_VALUE") {
                    resolve(response.value);
                } else if (response.type === "ERROR") {
                    reject(response.error);
                }
            };
            this.messagingBackend.onMessage(responseListener);
        });
    }

    handleCallbackResponse(response) {
        if (response.type !== "CALLBACK") {
            return;
        }
        const callbackFunction = this.callbackRegistry.getCallbackFunction(response.id);
        if (callbackFunction) {
            callbackFunction(...response.args);
        }
    }

    handleDeleteCallback(response) {
        if (response.type !== "DELETE_CALLBACK") {
            return;
        }
        this.callbackRegistry.deleteCallback(response.callbackId);
    }
}

const defaultConfig = {
    events: [],
    timeoutFn: callback => setTimeout(callback, 1000),
    messages: new Messages()
};

const createRpcClient = (messagingBackend, config) => {
    const actualConfig = Object.assign({}, defaultConfig, config);
    return new Proxy({}, new RpcClientHandler(messagingBackend, actualConfig));
};

const waitForServer = (messagingBackend, config) => {
    return new Promise((resolve, reject) => {
        const pingMsg = config.messages.ping();
        const pingId = setInterval(() => {
            messagingBackend.sendMessage(pingMsg);
        }, 200);

        const timeoutId = config.timeoutFn(() => {
            clearInterval(pingId);
            reject(new Error("Timeout during connecting to server."));
        });
        const messageListener = responseMsg => {
            if (responseMsg.type === "PONG" && responseMsg.id === pingMsg.id) {
                messagingBackend.removeMessageListener(messageListener);
                clearInterval(pingId);
                clearTimeout(timeoutId);
                resolve();
            }
        };
        messagingBackend.onMessage(messageListener);
        messagingBackend.sendMessage(pingMsg);
    });
};

const connect = (messagingBackend, config) => {
    const actualConfig = Object.assign({}, defaultConfig, config);
    actualConfig.messages = new Messages(actualConfig.recipient);
    return waitForServer(messagingBackend, actualConfig).then(() => createRpcClient(messagingBackend, actualConfig));
};

module.exports.connect = connect;
module.exports.createRpcClient = createRpcClient;
