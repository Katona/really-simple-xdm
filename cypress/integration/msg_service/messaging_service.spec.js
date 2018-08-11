describe("Messages", () => {
    it("should appear on load", () => {
        cy.visit("http://localhost:1234");
        cy.get("#response_from_iframe").contains("Iframe message");
        cy.get("#testFrame").then(function($iframe) {
            const $jbody = $iframe.contents().find("body");
            const $body = $jbody[0];
            cy
                .wrap($body)
                .find("#response_from_parent")
                .contains("Parent message");
        });
    });
});
