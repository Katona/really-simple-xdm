const equal = require("deep-equal");

class CallbackRegistrationHandler {
    constructor() {
        this.callbackFunctions = [];
        this.callbackRegistrations = [];
    }

    getCallback(callbackId) {
        const callbackEntry = this.callbackFunctions.find(c => c.callbackId === callbackId);
        return callbackEntry ? callbackEntry.callbackFunction : null;
    }

    getCallbackId(callbackFunction) {
        const callbackEntry = this.callbackFunctions.find(c => c.callbackFunction === callbackFunction);
        return callbackEntry ? callbackEntry.callbackId : null;
    }

    addCallback(callbackId, callbackFunction) {
        this.callbackFunctions.push({ callbackId, callbackFunction });
    }

    removeCallback(callbackId) {
        this.callbackFunctions = this.callbackFunctions.filter(c => c.callbackId !== callbackId);
    }

    addRegistration(callbackId, ...registrationProperties) {
        this.callbackRegistrations.push({ callbackId, registrationProperties });
    }

    getRegistration(...registrationProperties) {
        return this.callbackRegistrations.find(registration =>
            equal(registration.registrationProperties, registrationProperties)
        );
    }

    removeRegistration(registration) {
        this.callbackRegistrations = this.callbackRegistrations.filter(reg => reg !== registration);
    }

    hasRegistrations(callbackId) {
        return this.callbackRegistrations.filter(reg => reg.callbackId === callbackId).length !== 0;
    }
}

module.exports = CallbackRegistrationHandler;
