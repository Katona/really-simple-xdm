let uuid = require("uuid");
const messages = require("./messages");
const equal = require("deep-equal");
const CallbackRegistrationHandler = require("./callback_registration_handler");

class RpcServer {
    constructor(messagingBackend, serverObject) {
        this.callbackRegistrationHandler = new CallbackRegistrationHandler();
        this.messagingBackend = messagingBackend;
        this.serverObject = serverObject;
        this.messagingBackend.onMessage(this.onMessage.bind(this));
    }

    onMessage(message) {
        if (message.type === "FUNCTION_CALL") {
            this.handleFunctionCall(message);
        } else if (message.type === "CALLBACK_REGISTRATION") {
            this.handleCallbackRegistration(message);
        } else if (message.type === "CALLBACK_DEREGISTRATION") {
            this.handleCallbackDeregistration(message);
        } else if (message.type === "PING") {
            this.handlePing(message);
        }
    }

    handleFunctionCall({ id, functionName, args }) {
        try {
            const argumentValues = args.map(a => a.value);
            const functionToCall = this.serverObject[functionName];
            if (!functionToCall) {
                this.messagingBackend.sendMessage(messages.error(id, new Error(`${functionName} is not a function`)));
                return;
            }
            let response = functionToCall.apply(this.serverObject, argumentValues); // eslint-disable-line
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

    handleCallbackRegistration({ messageId, functionName, args }) {
        const callbackArgument = args.find(arg => arg.type === "function");
        const callbackId = callbackArgument.value;
        let callbackFunction = this.callbackRegistrationHandler.getCallback(callbackId);
        if (!callbackFunction) {
            callbackFunction = (...a) => this.messagingBackend.sendMessage(messages.callback(callbackId, ...a));
            this.callbackRegistrationHandler.addCallback(callbackId, callbackFunction);
        }
        this.callbackRegistrationHandler.addRegistration(callbackId, functionName, ...args);

        const actualArgs = args.map(a => (a.type === "function" ? callbackFunction : a.value));
        try {
            this.serverObject[functionName].apply(this.serverObject, actualArgs);
            this.messagingBackend.sendMessage(messages.returnValue(messageId, undefined));
        } catch (error) {
            this.messagingBackend.sendMessage(messages.error(messageId, error));
        }
    }

    handleCallbackDeregistration({ id, functionName, registerFunctionName, args }) {
        let callbackRegistration = this.callbackRegistrationHandler.getRegistration(registerFunctionName, ...args);
        if (!callbackRegistration) {
            this.messagingBackend.sendMessage(messages.error(id, "Callback is not registered.", functionName));
            return;
        }
        const callbackFunction = this.callbackRegistrationHandler.getCallback(callbackRegistration.callbackId);
        const actualArgs = args.map(a => (a.type === "function" ? callbackFunction : a.value));
        try {
            this.serverObject[functionName].apply(this.serverObject, actualArgs);
            this.messagingBackend.sendMessage(messages.returnValue(id, undefined));
            this.removeRegistration(callbackRegistration);
            if (!this.callbackRegistrationHandler.hasRegistrations(callbackRegistration.callbackId)) {
                this.callbackRegistrationHandler.removeCallback(callbackRegistration.callbackId);
            }
        } catch (error) {
            this.messagingBackend.sendMessage(messages.error(id, error, functionName));
        }
    }

    handlePing(message) {
        this.messagingBackend.sendMessage(messages.pong());
    }
}

module.exports.RpcServer = RpcServer;
