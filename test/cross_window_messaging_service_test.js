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
    t.context.msgService.onMessage(messageListener);
    t.is(t.context.window.addEventListener.callCount, 1);
    t.is(t.context.window.addEventListener.firstCall.args[0], "message");
    const eventListener = t.context.window.addEventListener.firstCall.args[1];

    const messageFromOtherOrigin = {
        origin: "otherOrigin"
    };
    eventListener(messageFromOtherOrigin);
    t.is(messageListener.callCount, 0);

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
