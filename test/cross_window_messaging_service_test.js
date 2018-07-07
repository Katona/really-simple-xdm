import test from "ava";
import jsdom from "jsdom";
import CrossWindowMessagingService from "../src/cross_window_messaging_service";

const { JSDOM } = jsdom;

test.cb("Test send message", t => {
    const { window } = new JSDOM("", {
        url: "http://bar.com/"
    });

    var frame = window.document.createElement("iframe");
    window.document.body.appendChild(frame);
    frame.contentWindow.addEventListener("message", e => {
        t.is(e.data.message, "hello");
        t.end();
    });
    const msgService = new CrossWindowMessagingService(frame.contentWindow, "http://bar.com", window);
    msgService.sendMessage({ message: "hello" });
});
