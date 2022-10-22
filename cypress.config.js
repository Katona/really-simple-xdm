const { defineConfig } = require("cypress");

module.exports = defineConfig({
    reporter: "junit",
    reporterOptions: {
        mochaFile: "dist/test-results/cypress/test-results-[hash].xml"
    },
    video: false,
    e2e: {
        // We've imported your old cypress plugins here.
        // You may want to clean this up later by importing these.
        setupNodeEvents(on, config) {
            return require("./cypress/plugins/index.js")(on, config);
        },
        excludeSpecPattern: "*.html"
    }
});
