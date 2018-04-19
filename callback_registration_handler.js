const equal = require('deep-equal');

class CallbackRegistrationHandler {

    constructor() {
        this.callbackFunctions = {};
        this.callbackRegistrations = [];
    }

    getCallback(callbackId) {
        return this.callbackFunctions[callbackId];
    }

    addCallback(callbackId, callbackFunction) {
        this.callbackFunctions[callbackId] = callbackFunction;
    }

    removeCallback(callbackId) {
        delete this.callbackFunctions[callbackId];
    }

    addRegistration(callbackId, functionName, args) {
        this.callbackRegistrations.push({callbackId, functionName, args});
    }

    getRegistration(functionName, args) {
        return this.callbackRegistrations.find(registration => equal(registration.args, args) && registration.functionName === functionName);
    }
    
    removeRegistration(registration) {
        this.callbackRegistrations = this.callbackRegistrations.filter(reg => reg !== registration);
    }

    hasRegistrations(callbackId) {
        return this.callbackRegistrations.filter(reg => reg.callbackId === callbackId).length !== 0;
    }
}

module.exports = CallbackRegistrationHandler;