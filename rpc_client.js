let uuid = require('uuid');

class RpcClientHandler {

    constructor(messagingBackend) {
        this.callbackRegistrations = [];
        this.callbacks = [];
        this.callbackRegistrationMetadata = [{register: "on", deregister: "off"}];
        this.messagingBackend = messagingBackend;
        this.messagingBackend.onResponse(this.handleCallbackResponse.bind(this));
    }
    get(target, propKey) {
        const callbackMetadata = this.callbackRegistrationMetadata.find(metadata => propKey === metadata.deregister || propKey === metadata.register);
        return callbackMetadata 
            ? this.handleCallbackRegistration(callbackMetadata, target, propKey)
            : this.handleFunctionCall(target, propKey);
    }

    handleFunctionCall(target, propKey) {
        console.log('function')
        return (...args) => {
            console.log(`${propKey}(${JSON.stringify(args)})`);
            const argDescriptors = args.map(arg => 
                ({
                    type: typeof arg,
                    value: arg
                })
            );
            let msg = {
                type: 'FUNCTION_CALL',
                id: uuid.v4(),
                functionName: propKey,
                args: argDescriptors,
            }
            this.messagingBackend.sendMessage(msg);
            return new Promise((resolve, reject) => {
                const responseListener = response => {
                    if (response.id !== msg.id) {
                        return;
                    }
                    this.messagingBackend.removeResponseListener(responseListener);
                    if (response.type === 'RETURN_VALUE') {
                        resolve(response.value);
                    } else if (response.type === 'ERROR') {
                        reject(this.response.error);
                    }
                }
                this.messagingBackend.onResponse(responseListener);
            });
        }
    }

    handleCallbackRegistration(callbackMetadata, target, propKey) {
        return callbackMetadata.register === propKey 
            ? this.registerCallback(callbackMetadata, target, propKey)
            : this.deRegisterCallback(callbackMetadata, target, propKey);
    }

    registerCallback(callbackMetadata, target, propKey) {
        return (...args) => {
            console.log(`${propKey}(${JSON.stringify(args)})`);
            const callbackFunction = args.find(arg => typeof arg === 'function');
            let callbackRegistration = this.callbackRegistrations.find(c => c.callbackFunction === callbackFunction);
            const callbackId = callbackRegistration ? callbackRegistration.callbackId : uuid.v4();
            const argDescriptors = args.map(arg => {
                if (typeof arg === 'function') {
                    return {
                        type: typeof arg,
                        id: callbackId
                    };
                } else {
                    return {
                        type: typeof arg,
                        value: arg
                    };
                }
            });
            let msg = {
                type: 'CALLBACK_REGISTRATION',
                id: uuid.v4(),
                functionName: propKey,
                args: argDescriptors,
            }
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
                    this.messagingBackend.removeResponseListener(responseListener);
                    if (response.type === 'RETURN_VALUE') {
                        resolve(response.value);
                    } else if (response.type === 'ERROR') {
                        reject(this.response.error);
                    }
                }
                this.messagingBackend.onResponse(responseListener);
            });
        }
    }

    deRegisterCallback(callbackMetadata, target, propKey) {
        return (...args) => {
            console.log(`${propKey}(${JSON.stringify(args)})`);
            const callbackFunction = args.find(arg => typeof arg === 'function');
            
            const callbackRegistration = this.callbackRegistrations.find(c => c.callbackFunction === callbackFunction);
            if (!callbackRegistration) {
                console.warn('Callback is not registered');
                return;
            }
            const argDescriptors = args.map(arg => {
                if (typeof arg === 'function') {
                    return {
                        type: typeof arg,
                        id: callbackRegistration.callbackId
                    };
                } else {
                    return {
                        type: typeof arg,
                        value: arg
                    };
                }
            });
            let msg = {
                type: 'CALLBACK_DEREGISTRATION',
                id: uuid.v4(),
                functionName: propKey,
                args: argDescriptors,
            }
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
                    this.messagingBackend.removeResponseListener(responseListener);
                    if (response.type === 'RETURN_VALUE') {
                        resolve(response.value);
                    } else if (response.type === 'ERROR') {
                        reject(this.response.error);
                    }
                }
                this.messagingBackend.onResponse(responseListener);
            });
        }   
    }

    handleCallbackResponse(response) {
        console.log('handle callback')
        if (response.type !== 'CALLBACK') {
            return;
        }
        const callbackRegistration = this.callbackRegistrations.find(cbRegistration => response.id === cbRegistration.callbackId);
        if (callbackRegistration) {
            callbackRegistration.callbackFunction(...response.args);
        }
    }

}

module.exports.RpcClientHandler = RpcClientHandler;