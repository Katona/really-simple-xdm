let uuid = require('uuid');
const messages = require('./messages');

class RpcServer {
    constructor(messagingBackend, serverObject) {
        this.callbackRegistrations = [];
        this.messagingBackend = messagingBackend;
        this.serverObject = serverObject;
        this.messagingBackend.onMessage(this.onMessage.bind(this));
    }

    onMessage(message) {
        if (message.type === 'FUNCTION_CALL') {
            this.handleFunctionCall(message);
        } else if (message.type === 'CALLBACK_REGISTRATION') {
            this.handleCallbackRegistration(message);
        } else if (message.type === 'CALLBACK_DEREGISTRATION') {
            this.handleCallbackDeregistration(message);
        }
    }

    handleFunctionCall({id, functionName, args}) {
        try {
            const argumentValues = args.map(a => a.value);
            let response = this.serverObject[functionName].apply(this.serverObject, argumentValues); // eslint-disable-line
            if (response instanceof Promise) {
                response
                    .then(result => this.messagingBackend.sendMessage(messages.returnValue(id, result)))
                    .catch(error => this.messagingBackend.sendMessage(messages.error(id, error)));
            } else {
                this.messagingBackend.sendMessage(messages.returnValue(id, response));
            }
        } catch (error) {
            this.messagingBackend.sendMessage(messages.error(id, error));
        }
    }

    handleCallbackRegistration({id, functionName, args}) {
        const callbackArgument = args.find(arg => arg.type === 'function');
        let callbackRegistration = this.callbackRegistrations.find(registration => registration.id === callbackArgument.id);
        if (!callbackRegistration) {
            callbackRegistration = {
                id: callbackArgument.id,
                count: 0,
                callbackFunction: (...a) => {
                    this.messagingBackend.sendMessage(messages.callback(callbackArgument.id, a));
                }
            }
            this.callbackRegistrations.push(callbackRegistration);
        }
        callbackRegistration.count++;
        const actualArgs = args.map(a => a.type === 'function' ? callbackRegistration.callbackFunction : a.value);
        try {
            this.serverObject[functionName].apply(this.serverObject, actualArgs);
            this.messagingBackend.sendMessage(messages.returnValue(id, undefined));
        } catch (error) {
            this.messagingBackend.sendMessage(messages.error(id, error));
        }
    }

    handleCallbackDeregistration({id, functionName, args}) {
        const callbackDescriptor = args.find(arg => arg.type === 'function');
        let callbackRegistration = this.callbackRegistrations.find(registration => registration.id === callbackDescriptor.id);
        if (!callbackRegistration) {
            this.messagingBackend.sendMessage(messages.error(id, 'Callback is not registered.', functionName));
            return;
        }
        const actualArgs = args.map(a => a.type === 'function' ? callbackRegistration.callbackFunction : a.value);
        try {
            this.serverObject[functionName].apply(this.serverObject, actualArgs);
            this.messagingBackend.sendMessage(messages.returnValue(id, undefined));
            callbackRegistration.count--;
            if (callbackRegistration.count === 0) {
                this.callbackRegistrations = this.callbackRegistrations.filter(registration => registration !== callbackRegistration);
            }
        } catch (error) {
            this.messagingBackend.sendMessage(messages.error(id, error, functionName));
        }
    }
}

module.exports.RpcServer = RpcServer