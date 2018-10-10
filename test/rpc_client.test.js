import test from "ava";
import { createRpcClient, connect } from "../src/rpc_client";
import sinon from "sinon";
import Messages from "../src/messages";

test.beforeEach(t => {
    t.context.testBackend = {
        sendMessage: sinon.stub(),
        onMessage: sinon.stub(),
        removeMessageListener: sinon.stub()
    };
    const options = {
        events: [{ register: "on", deregister: "off" }],
        messages: new Messages()
    };
    t.context.messages = options.messages;
    t.context.client = createRpcClient(t.context.testBackend, options);
});

test("should register a response listener for callbacks", t => {
    t.is(t.context.testBackend.onMessage.firstCall.args.length, 1);
});

test("should handle callbacks.", t => {
    t.is(t.context.testBackend.onMessage.firstCall.args.length, 1);
    // Grab the response listener which is registered on the messaging backend
    const callbackResponseListener = t.context.testBackend.onMessage.firstCall.args[0];
    const testCallback = sinon.stub();
    // Register a callback
    t.context.client.on("test", testCallback);
    // Check registration message
    t.is(t.context.testBackend.sendMessage.firstCall.args.length, 1);
    const cbRegistrationMessage = t.context.testBackend.sendMessage.firstCall.args[0];
    t.is(cbRegistrationMessage.type, "FUNCTION_CALL");
    t.is(cbRegistrationMessage.args.length, 2);
    t.is(cbRegistrationMessage.args[0].type, "string");
    t.is(cbRegistrationMessage.args[1].type, "function");
    const callbackArgument = cbRegistrationMessage.args[1];
    // Trigger a callback response
    callbackResponseListener(t.context.messages.callback(callbackArgument.value, "firstArg", "secondArg"));
    t.is(testCallback.callCount, 1);
    t.deepEqual(testCallback.firstCall.args, ["firstArg", "secondArg"]);

    // Deregister callback
    t.context.client.off("test", testCallback);
    // Check message
    t.is(t.context.testBackend.sendMessage.callCount, 2);
    const cbDeregistrationMessage = t.context.testBackend.sendMessage.secondCall.args[0];
    t.is(cbDeregistrationMessage.type, "FUNCTION_CALL");
    t.is(cbDeregistrationMessage.args.length, 2);
    t.is(cbDeregistrationMessage.args[0].type, "string");
    t.is(cbDeregistrationMessage.args[1].type, "function");

    callbackResponseListener(t.context.messages.callback(cbDeregistrationMessage.args[1].id, ["firstArg"]));
    t.is(testCallback.callCount, 1, "Callback should have not been invoked since it has been deregistered.");
});

test("should handle function calls", async t => {
    const responsePromise = t.context.client.testFunction(1, "secondArg");
    t.is(t.context.testBackend.sendMessage.callCount, 1);
    const functionCallMessage = t.context.testBackend.sendMessage.firstCall.args[0];
    t.is(functionCallMessage.type, "FUNCTION_CALL");
    t.is(functionCallMessage.functionName, "testFunction");
    t.deepEqual(functionCallMessage.args[0], { type: "number", value: 1 });
    t.deepEqual(functionCallMessage.args[1], {
        type: "string",
        value: "secondArg"
    });
    // One listener for the callbacks, and one for specifically listening to the response of the function call
    t.is(t.context.testBackend.onMessage.callCount, 2);
    const functionCallResponseListener = t.context.testBackend.onMessage.secondCall.args[0];
    // Emulate response message with the result
    functionCallResponseListener(t.context.messages.returnValue(functionCallMessage.id, "return value"));
    t.is(t.context.testBackend.removeMessageListener.callCount, 1);
    t.is(t.context.testBackend.removeMessageListener.firstCall.args[0], functionCallResponseListener);
    const returnValue = await responsePromise;
    t.is(returnValue, "return value");
});

test("should handle function call errors", async t => {
    const responsePromise = t.context.client.testFunction(1, "secondArg");
    const functionCallMessage = t.context.testBackend.sendMessage.firstCall.args[0];
    // One listener for the callbacks, and one for specifically listening to the response of the function call
    t.is(t.context.testBackend.onMessage.callCount, 2);
    const functionCallResponseListener = t.context.testBackend.onMessage.secondCall.args[0];
    // Emulate error
    functionCallResponseListener(t.context.messages.error(functionCallMessage.id, "error message"));
    t.is(t.context.testBackend.removeMessageListener.callCount, 1);
    t.is(t.context.testBackend.removeMessageListener.firstCall.args[0], functionCallResponseListener);
    try {
        const returnValue = await responsePromise;
    } catch (e) {
        t.is(e, "error message");
    }
});

test("connect() should return a Promise which resolves to the client after successful handshake", async t => {
    const messagingService = {
        sendMessage: sinon.stub(),
        onMessage: sinon.stub(),
        removeMessageListener: sinon.stub()
    };
    const rpcClientPromise = connect(messagingService);
    t.is(messagingService.onMessage.callCount, 1);
    const messageListener = messagingService.onMessage.firstCall.args[0];
    t.is(messagingService.sendMessage.callCount > 0, true); // PING messages ...
    t.is(messagingService.sendMessage.firstCall.args[0].type, "PING");
    messageListener(t.context.messages.pong(messagingService.sendMessage.firstCall.args[0].id));
    const rpcClient = await rpcClientPromise;
});

test("connect() should return a Promise which rejects in case of connection timeout", async t => {
    const localTestBackend = {
        sendMessage: sinon.stub(),
        onMessage: sinon.stub(),
        removeMessageListener: sinon.stub()
    };
    const timeoutFn = sinon.stub();
    const rpcClientPromise = connect(localTestBackend, { timeoutFn });
    timeoutFn.firstCall.args[0]();
    await t.throws(rpcClientPromise, "Timeout during connecting to server.");
});
