import test from "ava";
import { createClient } from "../src/rpc/rpc_client";
import { createServer } from "../src/rpc/rpc_server";
import sinon from "sinon";
import { EventEmitter } from "events";

class SimpleMessagingService {
    constructor() {
        this.listeners = [];
    }

    setTarget(target) {
        this.target = target;
    }

    acceptMessage(msg) {
        this.listeners.forEach(l => l(msg));
    }

    sendMessage(msg) {
        this.target.acceptMessage(msg);
    }

    onMessage(callback) {
        this.listeners.push(callback);
    }

    removeMessageListener(callback) {
        this.listeners = this.listeners.filter(listener => listener !== callback);
    }
}

class TestMessagingService {
    constructor() {
        this.serverMessagingService = new SimpleMessagingService();
        this.clientMessagingService = new SimpleMessagingService();
        this.serverMessagingService.setTarget(this.clientMessagingService);
        this.clientMessagingService.setTarget(this.serverMessagingService);
    }

    getServerMessagingService() {
        return this.serverMessagingService;
    }
    getClientMessagingService() {
        return this.clientMessagingService;
    }
}

test.beforeEach(t => {
    const testBackend = new TestMessagingService();
    t.context.createClient = params =>
        createClient({ ...params, messagingService: testBackend.getClientMessagingService() });
    t.context.createServer = config => {
        const server = createServer({
            ...config,
            messagingService: testBackend.getServerMessagingService()
        });
        server.serve();
        return server;
    };
});

test("with Math object", async t => {
    const rpcServer = t.context.createServer({ serviceObject: Math });
    const rpcClient = await t.context.createClient();
    rpcServer.serve();
    const abs = await rpcClient.abs(-1);
    t.is(abs, 1);

    const max = await rpcClient.max(-10, 0, 22);
    t.is(max, 22);
});

test("test calling of non existing function", async t => {
    const rpcServer = t.context.createServer({ serviceObject: {} });
    const rpcClient = await t.context.createClient();
    rpcServer.serve();

    const promise = rpcClient.nonExisting("asdfds");
    promise.catch(e => t.is(e.message, "nonExisting is not a function"));
});

test("Simple callback test", async t => {
    const testEventEmitter = new EventEmitter();
    const config = {
        serviceObject: testEventEmitter,
        events: [{ register: "on", deregister: "removeListener" }]
    };
    const rpcServer = t.context.createServer(config);
    const rpcClient = await t.context.createClient();
    const eventListener = sinon.stub();

    rpcClient.on("event1", eventListener);
    testEventEmitter.emit("event1", "testParam1", 2);
    t.is(eventListener.callCount, 1);
    t.deepEqual(eventListener.firstCall.args, ["testParam1", 2]);

    rpcClient.removeListener("event1", eventListener);
    testEventEmitter.emit("event1");
    t.is(eventListener.callCount, 1);
});

test("Multiple callbacks test", async t => {
    const testEventEmitter = new EventEmitter();
    const options = {
        serviceObject: testEventEmitter,
        events: [{ register: "on", deregister: "removeListener" }]
    };
    const rpcServer = t.context.createServer(options);
    const rpcClient = await t.context.createClient(options);
    const event1Listener = sinon.stub();
    const event2Listener = sinon.stub();

    rpcClient.on("event1", event1Listener);
    testEventEmitter.emit("event1", 1);
    t.is(event1Listener.callCount, 1);
    t.is(event1Listener.firstCall.args[0], 1);

    rpcClient.on("event2", event2Listener);
    testEventEmitter.emit("event2", 2);
    t.is(event2Listener.callCount, 1);
    t.is(event2Listener.firstCall.args[0], 2);

    rpcClient.removeListener("event1", event1Listener);
    testEventEmitter.emit("event1", 1);
    t.is(event1Listener.callCount, 1);

    testEventEmitter.emit("event2", 2);
    t.is(event2Listener.callCount, 2);

    rpcClient.removeListener("event2", event2Listener);
    testEventEmitter.emit("event2", 2);
    t.is(event2Listener.callCount, 2);
});

test("Same callback multiple times for same event.", async t => {
    const testEventEmitter = new EventEmitter();
    const config = {
        serviceObject: testEventEmitter,
        events: [{ register: "on", deregister: "removeListener" }]
    };
    const rpcServer = t.context.createServer(config);
    const rpcClient = await t.context.createClient();
    const eventListener = sinon.stub();

    rpcClient.on("event1", eventListener);
    rpcClient.on("event1", eventListener);
    testEventEmitter.emit("event1", 1);
    t.is(eventListener.callCount, 2);
    t.is(eventListener.firstCall.args[0], 1);
    t.is(eventListener.secondCall.args[0], 1);

    rpcClient.removeListener("event1", eventListener);
    testEventEmitter.emit("event1", 1);
    t.is(eventListener.callCount, 3);

    rpcClient.removeListener("event1", eventListener);
    testEventEmitter.emit("event1", 1);
    t.is(eventListener.callCount, 3);
});

test("Same callback for different events.", async t => {
    const testEventEmitter = new EventEmitter();
    const clientOptions = {
        events: [{ register: "on", deregister: "removeListener" }]
    };
    const rpcServer = t.context.createServer({ serviceObject: testEventEmitter });
    const rpcClient = await t.context.createClient(clientOptions);
    const eventListener = sinon.stub();

    rpcClient.on("event1", eventListener);
    rpcClient.on("event2", eventListener);
    testEventEmitter.emit("event1", 1);
    t.is(eventListener.callCount, 1);
    t.is(eventListener.firstCall.args[0], 1);

    testEventEmitter.emit("event2", 2);
    t.is(eventListener.callCount, 2);
    t.is(eventListener.secondCall.args[0], 2);

    rpcClient.removeListener("event1", eventListener);
    testEventEmitter.emit("event1", 1);
    t.is(eventListener.callCount, 2);

    rpcClient.removeListener("event2", eventListener);
    testEventEmitter.emit("event2", 2);
    t.is(eventListener.callCount, 2);
});

test("Multiple server object with single messaging service.", async t => {
    const testMessagingService = new TestMessagingService();
    const mathServer = createServer({
        serviceObject: Math,
        name: "Math",
        messagingService: testMessagingService.getServerMessagingService()
    });
    mathServer.serve();
    const numberServer = createServer({
        serviceObject: Number,
        name: "Number",
        messagingService: testMessagingService.getServerMessagingService()
    });
    numberServer.serve();

    const mathProxy = await createClient({
        messagingService: testMessagingService.getClientMessagingService(),
        serverName: "Math"
    });
    const abs = await mathProxy.abs(-1);
    t.is(abs, 1);

    const integerProxy = await createClient({
        messagingService: testMessagingService.getClientMessagingService(),
        serverName: "Number"
    });
    const isInteger = await integerProxy.isInteger(1);
    t.is(isInteger, true);
});
