const uuid = require("uuid");
const Messages = require("./messages");
const serializeArgs = require("./serialize").serializeArgs;
const CallbackRegistry = require("./callback_registry");

const defaultConfig = {
    timeoutFn: callback => setTimeout(callback, 5000),
    messages: new Messages()
};

class RpcClientHandler {
    constructor(config) {
        this.messages = config.messages;
        this.callbackRegistry = new CallbackRegistry();
        this.messagingService = config.messagingService;
        this.messagingService.onMessage(this.handleCallbackResponse.bind(this));
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
            this.messagingService.sendMessage(msg);
            return resultPromise;
        };
    }

    createResult(originalMessage) {
        return new Promise((resolve, reject) => {
            const responseListener = response => {
                if (response.id !== originalMessage.id) {
                    return;
                }
                this.messagingService.removeMessageListener(responseListener);
                if (response.type === "RETURN_VALUE") {
                    resolve(response.value);
                } else if (response.type === "ERROR") {
                    reject(response.error);
                }
            };
            this.messagingService.onMessage(responseListener);
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

const createRpcClientSync = config => {
    const actualConfig = Object.assign({}, defaultConfig, config);
    return new Proxy({}, new RpcClientHandler(actualConfig));
};

const waitForServer = config => {
    return new Promise((resolve, reject) => {
        const messagingService = config.messagingService;
        const pingMsg = config.messages.ping();
        const pingId = setInterval(() => {
            messagingService.sendMessage(pingMsg);
        }, 200);

        const timeoutId = config.timeoutFn(() => {
            clearInterval(pingId);
            reject(new Error("Timeout during connecting to server."));
        });
        const messageListener = responseMsg => {
            if (responseMsg.type === "PONG" && responseMsg.id === pingMsg.id) {
                messagingService.removeMessageListener(messageListener);
                clearInterval(pingId);
                clearTimeout(timeoutId);
                resolve();
            }
        };
        messagingService.onMessage(messageListener);
        messagingService.sendMessage(pingMsg);
    });
};

const createRpcClient = config => {
    const actualConfig = Object.assign({}, defaultConfig, config);
    actualConfig.messages = new Messages(actualConfig.serverName);
    return waitForServer(actualConfig).then(() => createRpcClientSync(actualConfig));
};

module.exports.createClient = createRpcClient;
// Exporting it for testing purposes.
module.exports.createClientSync = createRpcClientSync;
