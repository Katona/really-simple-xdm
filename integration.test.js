import test from 'ava';
import {createRpcClient} from './rpc_client';
import {RpcServer} from './rpc_server';
import sinon from 'sinon';

class SimpleBackend {
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
        this.target.acceptMessage(msg)
    }

    onMessage(callback) {
        this.listeners.push(callback);
    }

    removeMessageListener(callback) {
        this.listeners = this.listeners.filter(listener => listener === callback);
    }
}
class TestBackend {
    constructor() {
        this.serverBackend = new SimpleBackend();
        this.clientBackend = new SimpleBackend();
        this.serverBackend.setTarget(this.clientBackend);
        this.clientBackend.setTarget(this.serverBackend);
    }

    getServerBackend() { return this.serverBackend; }
    getClientBackend() { return this.clientBackend; }
}

class TestServiceClass {
    register(arg1, arg2, callback) {
        console.log("register ", arg1, arg2, callback);
        this.callback = callback;
    }

    deregister(arg1, arg2, callback) {
        console.log('deregister ', arg1, arg2, callback);
        if (this.callback === callback) {
            this.callback = undefined;
        }
    }

    voidFunction(arg) {
        console.log('voidFunction ', arg);
    }

    add(a, b) {
        console.log('add ', a, b);
        return a + b;
    }

    multiply(a, b) {
        return Promise.resolve(a * b);
    }

    objectParameter(obj) {
        return obj.field;
    }

    emitEvent(arg) {
        if (this.callback !== undefined) {
            this.callback(arg);
        }
    }
}

test.only('simple', async t => {

    const testBackend = new TestBackend();
    const rpcClient = createRpcClient(testBackend.getClientBackend(), [{ register: 'register', deregister: 'deregister' }]);
    const serviceObject = new TestServiceClass();
    const rpcServer = new RpcServer(testBackend.getServerBackend(), serviceObject);

    rpcClient.voidFunction('adf');
    const testCallback = args => { console.log('event received: ', args); }
    rpcClient.register('test', 'test2', testCallback);
    serviceObject.emitEvent('test event');
    rpcClient.deregister('test1', 'test3', testCallback);
    serviceObject.emitEvent('test event2');
    const sum = await rpcClient.add(3, 4);
    console.log('sum: ', sum);
    const product = await rpcClient.multiply(8, 6);
    console.log('product: ', product);
    const field = await rpcClient.objectParameter({ field: 'field of object' });
    console.log('field: ', field);
});