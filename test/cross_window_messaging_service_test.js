import test from "ava";
import sinon from "sinon";
import CrossWindowMessagingService from "../src/cross_window_messaging_service";

test.beforeEach(t => {
    const targetOrigin = "targetOrigin";
    t.context.window = {
        addEventListener: sinon.spy()
    };
    t.context.target = {
        postMessage: sinon.spy()
    };
    t.context.msgService = new CrossWindowMessagingService(t.context.target, targetOrigin, t.context.window);
});

test("Test send message", t => {
    const testMessage = {
        test: "test"
    };
    t.context.msgService.sendMessage({ test: "test" });
    t.is(t.context.target.postMessage.callCount, 1);
    t.deepEqual(t.context.target.postMessage.firstCall.args[0], testMessage);
    t.is(t.context.target.postMessage.firstCall.args[1], "targetOrigin");
});

test("Test receive message", t => {
    const messageListener = sinon.spy();
    const invalidMessageListener = sinon.spy();
    t.context.msgService.onMessage(messageListener);
    t.context.msgService.onInvalidMessage(invalidMessageListener);
    t.is(t.context.window.addEventListener.callCount, 1);
    t.is(t.context.window.addEventListener.firstCall.args[0], "message");
    const eventListener = t.context.window.addEventListener.firstCall.args[1];

    const messageFromOtherOrigin = {
        origin: "otherOrigin"
    };
    eventListener(messageFromOtherOrigin);
    t.is(messageListener.callCount, 0);
    t.is(invalidMessageListener.callCount, 1);
    t.is(invalidMessageListener.firstCall.args[0], messageFromOtherOrigin);

    const messageFromExpectedOrigin = {
        origin: "targetOrigin",
        data: {
            test: "test"
        }
    };
    eventListener(messageFromExpectedOrigin);
    t.is(messageListener.callCount, 1);
    t.is(messageListener.firstCall.args[0], messageFromExpectedOrigin.data);
});

test("Test remove invalid message listener", t => {
    const invalidMessageListener = sinon.spy();
    t.context.msgService.onInvalidMessage(invalidMessageListener);
    const eventListener = t.context.window.addEventListener.firstCall.args[1];

    const messageFromOtherOrigin = {
        origin: "otherOrigin"
    };
    eventListener(messageFromOtherOrigin);
    t.is(invalidMessageListener.callCount, 1);

    t.context.msgService.removeInvalidMessageListener(invalidMessageListener);
    eventListener(messageFromOtherOrigin);
    t.is(invalidMessageListener.callCount, 1);
});

test("Test remove message listener", t => {
    const messageListener = sinon.spy();
    t.context.msgService.onMessage(messageListener);
    const eventListener = t.context.window.addEventListener.firstCall.args[1];

    const messageFromExpectedOrigin = {
        origin: "targetOrigin",
        data: {
            test: "test"
        }
    };
    eventListener(messageFromExpectedOrigin);
    t.is(messageListener.callCount, 1);

    t.context.msgService.removeMessageListener(messageListener);
    eventListener(messageFromExpectedOrigin);
    t.is(messageListener.callCount, 1);
});

test("Test when target origin not specified then the origin of the first valid message will be used.", t => {
    const testWindow = {
        addEventListener: sinon.spy()
    };
    const testTarget = {
        postMessage: sinon.spy()
    };
    const msgService = new CrossWindowMessagingService(testTarget, undefined, testWindow, () => true);
    const messageListener = sinon.spy();
    msgService.onMessage(messageListener);
    const eventListener = testWindow.addEventListener.firstCall.args[1];

    const testMessage = {
        origin: "testOrigin",
        data: {
            test: "test"
        }
    };
    eventListener(testMessage);
    t.is(messageListener.callCount, 1);
    msgService.sendMessage({ key: "value" });
    t.is(testTarget.postMessage.callCount, 1);
    t.deepEqual(testTarget.postMessage.firstCall.args[1], "testOrigin");
});
