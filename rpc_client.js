let uuid = require('uuid');
let messages = require('./messages');

class RpcClientHandler {

    constructor(messagingBackend, callbackRegistrationMetadata) {
        this.callbackRegistrations = [];
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
            : this.deRegisterCallback(callbackMetadata, target, propKey);
    }

    registerCallback(callbackMetadata, target, functionName) {
        return (...args) => {
            const callbackFunction = args.find(arg => typeof arg === 'function');
            let callbackRegistration = this.callbackRegistrations.find(c => c.callbackFunction === callbackFunction);
            const callbackId = callbackRegistration ? callbackRegistration.callbackId : uuid.v4();
            let msg = messages.createCallbackRegistrationMessage(functionName, callbackId, ...args);
            if (!callbackRegistration) {
                callbackRegistration = { callbackFunction, callbackId, count: 0 };
                this.callbackRegistrations.push(callbackRegistration);
            }
            callbackRegistration.count++;
            this.messagingBackend.sendMessage(msg);
            return new Promise((resolve, reject) => {
                const responseListener = response => {
                    if (response.id !== msg.id) {
                        return;
                    }
                    this.messagingBackend.removeMessageListener(responseListener);
                    if (response.type === 'RETURN_VALUE') {
                        resolve(response.value);
                    } else if (response.type === 'ERROR') {
                        reject(this.response.error);
                    }
                }
                this.messagingBackend.onMessage(responseListener);
            });
        }
    }

    deRegisterCallback(callbackMetadata, target, functionName) {
        return (...args) => {
            const callbackFunction = args.find(arg => typeof arg === 'function');
            
            const callbackRegistration = this.callbackRegistrations.find(c => c.callbackFunction === callbackFunction);
            if (!callbackRegistration) {
                console.warn('Callback is not registered');
                return;
            }
            let msg = messages.createCallbackDeregistrationMessage(functionName, callbackMetadata.deregister, callbackRegistration.callbackId, ...args);
            callbackRegistration.count--;
            if (callbackRegistration.count === 0) {
                this.callbackRegistrations = this.callbackRegistrations.filter(r => r !== callbackRegistration);
            }
            this.messagingBackend.sendMessage(msg);
            return new Promise((resolve, reject) => {
                const responseListener = response => {
                    if (response.id !== msg.id) {
                        return;
                    }
                    this.messagingBackend.removeMessageListener(responseListener);
                    if (response.type === 'RETURN_VALUE') {
                        resolve(response.value);
                    } else if (response.type === 'ERROR') {
                        reject(this.response.error);
                    }
                }
                this.messagingBackend.onMessage(responseListener);
            });
        }   
    }

    handleCallbackResponse(response) {
        if (response.type !== 'CALLBACK') {
            return;
        }
        const callbackRegistration = this.callbackRegistrations.find(cbRegistration => response.id === cbRegistration.callbackId);
        if (callbackRegistration) {
            callbackRegistration.callbackFunction(...response.args);
        }
    }

}

module.exports.createRpcClient = (messagingBackend, callbackRegistrationMetadata) => 
    new Proxy({}, new RpcClientHandler(messagingBackend, callbackRegistrationMetadata));