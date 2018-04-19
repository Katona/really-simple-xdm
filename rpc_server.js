let uuid = require('uuid');
const messages = require('./messages');
const equal = require('deep-equal');

class RpcServer {
    constructor(messagingBackend, serverObject) {
        this.callbackFunctions = [];
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
        let callbackFunction = this.callbackFunctions.find(registration => registration.id === callbackArgument.id);
        if (!callbackFunction) {
            callbackFunction = {
                id: callbackArgument.id,
                function: (...a) => {
                    this.messagingBackend.sendMessage(messages.callback(callbackArgument.id, ...a));
                }
            }
            this.callbackFunctions.push(callbackFunction);
        }
        this.callbackRegistrations.push({ callbackId: callbackFunction.id, functionName, args});

        const actualArgs = args.map(a => a.type === 'function' ? callbackFunction.function : a.value);
        try {
            this.serverObject[functionName].apply(this.serverObject, actualArgs);
            this.messagingBackend.sendMessage(messages.returnValue(id, undefined));
        } catch (error) {
            this.messagingBackend.sendMessage(messages.error(id, error));
        }
    }

    getCallbackRegistration(functionName, args) {
        return this.callbackRegistrations.find(registration => equal(registration.args, args) && registration.functionName === functionName);
    }

    removeRegistration(registration) {
        this.callbackRegistrations = this.callbackRegistrations.filter(reg => reg !== registration);
    }

    handleCallbackDeregistration({id, functionName, registerFunctionName, args}) {
        let callbackRegistration = this.getCallbackRegistration(registerFunctionName, args);
        if (!callbackRegistration) {
            this.messagingBackend.sendMessage(messages.error(id, 'Callback is not registered.', functionName));
            return;
        }
        const callbackFunction = this.callbackFunctions.find(callbackFunction => callbackFunction.id === callbackRegistration.callbackId);
        const actualArgs = args.map(a => a.type === 'function' ? callbackFunction.function : a.value);
        try {
            this.serverObject[functionName].apply(this.serverObject, actualArgs);
            this.messagingBackend.sendMessage(messages.returnValue(id, undefined));
            this.removeRegistration(callbackRegistration);
            if (this.callbackRegistrations.filter(reg => reg.callbackId === callbackRegistration.callbackId).length === 0) {
                this.callbackFunctions = this.callbackFunctions.filter(registration => registration !== callbackRegistration);
            }
        } catch (error) {
            this.messagingBackend.sendMessage(messages.error(id, error, functionName));
        }
    }
}

module.exports.RpcServer = RpcServer