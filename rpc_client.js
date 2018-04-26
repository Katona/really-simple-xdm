let uuid = require('uuid');
let messages = require('./messages');
let CallbackRegistrationHandler = require('./callback_registration_handler');

class RpcClientHandler {

    constructor(messagingBackend, callbackRegistrationMetadata) {
        this.callbackRegistrationHandler = new CallbackRegistrationHandler();
        this.callbackRegistrationMetadata = callbackRegistrationMetadata;
        this.messagingBackend = messagingBackend;
        this.messagingBackend.onMessage(this.handleCallbackResponse.bind(this));
    }

    get(target, propKey) {
        const callbackMetadata = this.callbackRegistrationMetadata.find(metadata => propKey === metadata.deregister || propKey === metadata.register);
        return callbackMetadata 
            ? this.handleCallbackRegistration(callbackMetadata, target, propKey)
            : this.handleFunctionCall(target, propKey);
    }

    handleFunctionCall(target, functionName) {
        return (...args) => {
            let msg = messages.createFunctionCallMessage(functionName, args);
            const resultPromise = new Promise((resolve, reject) => {
                const responseListener = response => {
                    if (response.id !== msg.id) {
                        return;
                    }
                    this.messagingBackend.removeMessageListener(responseListener);

                    if (response.type === 'RETURN_VALUE') {
                        resolve(response.value);
                    } else if (response.type === 'ERROR') {
                        reject(response.error);
                    }
                }
                this.messagingBackend.onMessage(responseListener);
            });
            this.messagingBackend.sendMessage(msg);
            return resultPromise;
        }
    }

    handleCallbackRegistration(callbackMetadata, target, propKey) {
        return callbackMetadata.register === propKey 
            ? this.registerCallback(callbackMetadata, target, propKey)
            : this.deregisterCallback(callbackMetadata, target, propKey);
    }

    registerCallback(callbackMetadata, target, functionName) {
        return (...args) => {
            const callbackFunction = args.find(arg => typeof arg === 'function');
            let callbackId = this.callbackRegistrationHandler.getCallbackId(callbackFunction);
            if (!callbackId) {
                callbackId = uuid.v4();
                this.callbackRegistrationHandler.addCallback(callbackId, callbackFunction);
            }
            this.callbackRegistrationHandler.addRegistration(callbackId, functionName, args);
            let msg = messages.createCallbackRegistrationMessage(functionName, callbackId, ...args);
            this.messagingBackend.sendMessage(msg);
            return this.createReturnValuePromise(msg);
        }
    }

    deregisterCallback(callbackMetadata, target, functionName) {
        return (...args) => {
            const callbackFunction = args.find(arg => typeof arg === 'function');
            const callbackRegistration = this.callbackRegistrationHandler.getRegistration(callbackMetadata.register, args);
            if (!callbackRegistration) {
                console.warn('No registration exist for "%s" with arguments [%s]', functionName, args);
                return;
            }
            let msg = messages.createCallbackDeregistrationMessage(functionName, callbackMetadata.deregister, callbackRegistration.callbackId, ...args);
            this.callbackRegistrationHandler.removeRegistration(callbackRegistration);
            if (!this.callbackRegistrationHandler.hasRegistrations(callbackRegistration.callbackId)) {
                this.callbackRegistrationHandler.removeCallback(callbackRegistration.callbackId);
            }
            this.messagingBackend.sendMessage(msg);
            return this.createReturnValuePromise(msg);
        }
    }

    createReturnValuePromise(originalMessage) {
        return new Promise((resolve, reject) => {
            const responseListener = response => {
                if (response.id !== originalMessage.id) {
                    return;
                }
                this.messagingBackend.removeMessageListener(responseListener);
                if (response.type === 'RETURN_VALUE') {
                    resolve(response.value);
                } else if (response.type === 'ERROR') {
                    reject(response.error);
                }
            }
            this.messagingBackend.onMessage(responseListener);
        });
    }

    handleCallbackResponse(response) {
        if (response.type !== 'CALLBACK') {
            return;
        }
        const callbackFunction = this.callbackRegistrationHandler.getCallback(response.id);
        if (callbackFunction) {
            callbackFunction(...response.args);
        }
    }

}

module.exports.createRpcClient = (messagingBackend, callbackRegistrationMetadata) => 
    new Proxy({}, new RpcClientHandler(messagingBackend, callbackRegistrationMetadata));