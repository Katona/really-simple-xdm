
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
        }
    }

    handleFunctionCall({id, functionName, args}) {
        try {
            let response = this.serverObject[functionName].apply(this.serverObject, args); // eslint-disable-line
            if (response instanceof Promise) {
                response
                    .then(result => this.messagingBackend.sendMessage({ type: 'RETURN_VALUE', id, value: result } ))
                    .catch(error => this.messagingBackend.sendMessage({ type: 'ERROR', id, error }));
            } else {
                this.messagingBackend.sendMessage({ type: 'RETURN_VALUE', id, value: response });
            }
        } catch (error) {
            this.messagingBackend.sendMessage({ type: 'ERROR', id, error });
        }
    }
}

module.exports.RpcServer = RpcServer