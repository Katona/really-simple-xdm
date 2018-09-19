let uuid = require("uuid");
let messages = require("./messages");
let CallbackRegistrationHandler = require("./callback_registration_handler");

function assertCallbackCountIs(obj, count) {
    const fnCount = obj.reduce((fnCount, obj) => fnCount + (typeof obj === "function" ? 1 : 0), 0);
    if (fnCount !== count) throw new Error(`Allowed number of callback functions is ${count}, received ${fnCount}.`);
}
class RpcClientHandler {
    constructor(messagingBackend, callbackRegistrationMetadata) {
        this.callbackRegistrationHandler = new CallbackRegistrationHandler();
        this.callbackRegistrationMetadata = callbackRegistrationMetadata;
        this.messagingBackend = messagingBackend;
        this.messagingBackend.onMessage(this.handleCallbackResponse.bind(this));
    }

    get(target, propKey) {
        const callbackMetadata = this.callbackRegistrationMetadata.find(
            metadata => propKey === metadata.deregister || propKey === metadata.register
        );
        return callbackMetadata
            ? this.handleCallbackRegistration(callbackMetadata, target, propKey)
            : this.handleFunctionCall(target, propKey);
    }

    handleFunctionCall(target, functionName) {
        // TODO: we have to prevent 'then' calls, otherwise some code assumes that this is a Promise
        if (functionName === "then") {
            return;
        }
        return (...args) => {
            assertCallbackCountIs(args, 0);
            let msg = messages.functionCall(functionName, args);
            const resultPromise = this.createResult(msg);
            this.messagingBackend.sendMessage(msg);
            return resultPromise;
        };
    }

    handleCallbackRegistration(callbackMetadata, target, propKey) {
        return callbackMetadata.register === propKey
            ? this.registerCallback(callbackMetadata, target, propKey)
            : this.deregisterCallback(callbackMetadata, target, propKey);
    }

    registerCallback(callbackMetadata, target, functionName) {
        return (...args) => {
            assertCallbackCountIs(args, 1);
            const callbackFunction = args.find(arg => typeof arg === "function");
            let callbackId = this.callbackRegistrationHandler.getCallbackId(callbackFunction);
            if (!callbackId) {
                callbackId = uuid.v4();
                this.callbackRegistrationHandler.addCallback(callbackId, callbackFunction);
            }
            this.callbackRegistrationHandler.addRegistration(callbackId, functionName, ...args);
            let msg = messages.callbackRegistration(functionName, callbackId, args);
            this.messagingBackend.sendMessage(msg);
            return this.createResult(msg);
        };
    }

    deregisterCallback(callbackMetadata, target, functionName) {
        return (...args) => {
            assertCallbackCountIs(args, 1);
            const callbackRegistration = this.callbackRegistrationHandler.getRegistration(
                callbackMetadata.register,
                ...args
            );
            if (!callbackRegistration) {
                console.warn('No registration exist for "%s" with arguments [%s]', functionName, args);
                return;
            }
            let msg = messages.callbackDeregistration(
                functionName,
                callbackMetadata.register,
                callbackRegistration.callbackId,
                args
            );
            this.callbackRegistrationHandler.removeRegistration(callbackRegistration);
            if (!this.callbackRegistrationHandler.hasRegistrations(callbackRegistration.callbackId)) {
                this.callbackRegistrationHandler.removeCallback(callbackRegistration.callbackId);
            }
            this.messagingBackend.sendMessage(msg);
            return this.createResult(msg);
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
        const callbackFunction = this.callbackRegistrationHandler.getCallback(response.id);
        if (callbackFunction) {
            callbackFunction(...response.args);
        }
    }
}
const createRpcClient = (messagingBackend, callbackRegistrationMetadata = []) =>
    new Proxy({}, new RpcClientHandler(messagingBackend, callbackRegistrationMetadata));

const defaultTimeoutFunction = callback => {
    return setTimeout(callback, 1000);
};

const waitForServer = (messagingBackend, timeoutFn) => {
    return new Promise((resolve, reject) => {
        const pingMsg = messages.ping();
        const pingId = setInterval(() => {
            messagingBackend.sendMessage(pingMsg);
        }, 200);

        const timeoutId = timeoutFn(() => {
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
const connect = (messagingBackend, callbackRegistrationMetadata = [], timeoutFn = defaultTimeoutFunction) => {
    return waitForServer(messagingBackend, timeoutFn).then(() =>
        createRpcClient(messagingBackend, callbackRegistrationMetadata)
    );
};

module.exports.connect = connect;
module.exports.createRpcClient = createRpcClient;
