const createRpcClient = require("./rpc/rpc_client").createClient;
const createRpcServer = require("./rpc/rpc_server").createServer;
const CrossWindowMessagingService = require("./cross_window_messaging_service");

const createXdmClient = config => {
    const { targetOrigin, targetWindow, serverName } = config;
    const messagingService = new CrossWindowMessagingService(targetWindow, targetOrigin);
    return createRpcClient({ messagingService, serverName });
};

const createXdmServer = config => {
    const { serviceObject, events, name, targetOrigin, isMessageValid } = config;
    const messagingService = new CrossWindowMessagingService(window.parent, targetOrigin, window, isMessageValid);
    return createRpcServer({ serviceObject, messagingService, name, events });
};
module.exports.createClient = createXdmClient;
module.exports.createServer = createXdmServer;
