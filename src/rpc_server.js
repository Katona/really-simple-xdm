const Messages = require("./messages");
const EventRegistrationHandler = require("./event_registration_handler");
const deserializeArgs = require("./serialize").deserializeArgs;
const CallbackRegistry = require("./callback_registry");

const defaultConfig = {
    events: []
};
class RpcServer {
    constructor(messagingBackend, serverObject, config) {
        const actualConfig = Object.assign({}, defaultConfig, config);
        this.messagingBackend = messagingBackend;
        this.serverObject = serverObject;
        this.messages = new Messages();
        this.callbackRegistry = new CallbackRegistry();
        this.eventRegistrationHandler = new EventRegistrationHandler();
        this.events = actualConfig.events;
    }

    serve() {
        this.messagingBackend.onMessage(this.onMessage.bind(this));
    }

    onMessage(message) {
        if (message.type === "FUNCTION_CALL") {
            this.handleFunctionCall(message);
        } else if (message.type === "PING") {
            this.handlePing(message);
        }
    }

    handleFunctionCall({ id, functionName, args }) {
        try {
            const functionToCall = this.serverObject[functionName];
            if (!functionToCall) {
                this.messagingBackend.sendMessage(
                    this.messages.error(id, new Error(`${functionName} is not a function`))
                );
                return;
            }
            const newCallbacks = args
                .filter(arg => arg.type === "function")
                .filter(arg => this.callbackRegistry.getCallbackFunction(arg.value) === undefined)
                .map(arg => ({
                    id: arg.value,
                    fn: (...a) => this.messagingBackend.sendMessage(this.messages.callback(arg.value, ...a))
                }));
            this.callbackRegistry.registerCallbacks(newCallbacks);
            const argumentValues = deserializeArgs(args, this.callbackRegistry);
            let response = functionToCall.apply(this.serverObject, argumentValues); // eslint-disable-line
            if (response instanceof Promise) {
                response
                    .then(result => this.messagingBackend.sendMessage(this.messages.returnValue(id, result)))
                    .catch(error => this.messagingBackend.sendMessage(this.messages.error(id, error)));
            } else {
                this.messagingBackend.sendMessage(this.messages.returnValue(id, response));
            }
            this.handleEventHandlerRegistrations(functionName, args);
        } catch (error) {
            this.messagingBackend.sendMessage(this.messages.error(id, error));
        }
    }

    handleEventHandlerRegistrations(functionName, args) {
        const event = this.getCorrespondingEvent(functionName, args);
        if (event === undefined) {
            return;
        }
        if (event.register === functionName) {
            this.eventRegistrationHandler.addRegistration(functionName, args);
        } else {
            this.eventRegistrationHandler.removeRegistration(event.register, args);
            args
                .filter(a => a.type === "function")
                .map(a => a.value)
                .forEach(callbackId => {
                    if (!this.eventRegistrationHandler.hasRegistrations(callbackId)) {
                        this.messagingBackend.sendMessage(this.messages.deleteCallback(callbackId));
                        this.callbackRegistry.deleteCallback(callbackId);
                    }
                });
        }
    }
    getCorrespondingEvent(functionName, args) {
        const events = this.events.filter(
            event => event.register === functionName || event.deregister === functionName
        );
        return events.length === 1 ? events[0] : undefined;
    }
    handlePing(message) {
        this.messagingBackend.sendMessage(this.messages.pong(message.id));
    }
}

const createServer = (messagingBackend, serverObject, config) => new RpcServer(messagingBackend, serverObject, config);
module.exports.RpcServer = RpcServer;
module.exports.createServer = createServer;
