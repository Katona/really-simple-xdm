const Messages = require("./messages");
const EventRegistrationHandler = require("./event_registration_handler");
const deserializeArgs = require("./serialize").deserializeArgs;
const CallbackRegistry = require("./callback_registry");

const defaultConfig = {
    events: []
};
class RpcServer {
    constructor(config) {
        const actualConfig = Object.assign({}, defaultConfig, config);
        this.messagingService = config.messagingService;
        this.serviceObject = config.serviceObject;
        this.messages = new Messages();
        this.callbackRegistry = new CallbackRegistry();
        this.eventRegistrationHandler = new EventRegistrationHandler();
        this.config = actualConfig;
        this.messageFilter = message => this.config.name === undefined || this.config.name === message.recipient;
    }

    serve() {
        this.messagingService.onMessage(this.onMessage.bind(this));
    }

    onMessage(message) {
        if (!this.messageFilter(message)) {
            return;
        }
        if (message.type === "FUNCTION_CALL") {
            this.handleFunctionCall(message);
        } else if (message.type === "PING") {
            this.handlePing(message);
        }
    }

    handleFunctionCall({ id, functionName, args }) {
        try {
            const functionToCall = this.serviceObject[functionName];
            if (!functionToCall) {
                this.messagingService.sendMessage(
                    this.messages.error(id, new Error(`${functionName} is not a function`))
                );
                return;
            }
            const newCallbacks = args
                .filter(arg => arg.type === "function")
                .filter(arg => this.callbackRegistry.getCallbackFunction(arg.value) === undefined)
                .map(arg => ({
                    id: arg.value,
                    fn: (...a) => this.messagingService.sendMessage(this.messages.callback(arg.value, ...a))
                }));
            this.callbackRegistry.registerCallbacks(newCallbacks);
            const argumentValues = deserializeArgs(args, this.callbackRegistry);
            let response = functionToCall.apply(this.serviceObject, argumentValues); // eslint-disable-line
            if (response instanceof Promise) {
                response
                    .then(result => this.messagingService.sendMessage(this.messages.returnValue(id, result)))
                    .catch(error => this.messagingService.sendMessage(this.messages.error(id, error)));
            } else {
                this.messagingService.sendMessage(this.messages.returnValue(id, response));
            }
            this.handleEventHandlerRegistrations(functionName, args);
        } catch (error) {
            this.messagingService.sendMessage(this.messages.error(id, error));
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
                .filter(callbackId => !this.eventRegistrationHandler.hasRegistrations(callbackId))
                .forEach(callbackId => {
                    this.messagingService.sendMessage(this.messages.deleteCallback(callbackId));
                    this.callbackRegistry.deleteCallback(callbackId);
                });
        }
    }

    getCorrespondingEvent(functionName) {
        const events = this.config.events.filter(e => e.register === functionName || e.deregister === functionName);
        return events.length === 1 ? events[0] : undefined;
    }

    handlePing(message) {
        this.messagingService.sendMessage(this.messages.pong(message.id));
    }
}

const createServer = config => new RpcServer(config);
module.exports.RpcServer = RpcServer;
module.exports.createServer = createServer;
