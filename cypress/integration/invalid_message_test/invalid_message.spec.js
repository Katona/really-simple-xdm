describe("Messages", () => {
    it("should appear on load", () => {
        cy.visit("http://localhost:8080/invalid_message_test");
        cy.get("#testFrame").then(function($iframe) {
            const doc = $iframe.contents();
            const message = doc.find("#message");
            cy.wrap(message).contains("Invalid message has been received.");
        });
    });
});
