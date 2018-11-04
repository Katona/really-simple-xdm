const createRpcClient = require("./rpc/rpc_client").createClient;
const createRpcServer = require("./rpc/rpc_server").createServer;
const CrossWindowMessagingService = require("./cross_window_messaging_service");

const createXdmClient = config => {
    const { targetOrigin, targetWindow, serverName } = config;
    const messagingService = new CrossWindowMessagingService(targetWindow, targetOrigin);
    return createRpcClient({ messagingService, serverName });
};

const createXdmServer = (serviceObject, config) => {
    const { events, name, targetOrigin } = config;
    const messagingService = new CrossWindowMessagingService(window.parent, targetOrigin);
    return createRpcServer(serviceObject, { messagingService, name, events });
};
module.exports.createClient = createXdmClient;
module.exports.createServer = createXdmServer;
