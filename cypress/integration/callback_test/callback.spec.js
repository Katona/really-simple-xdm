describe("Messages", () => {
    it("should appear on load", () => {
        cy.visit("http://localhost:8080/callback_test");
        cy.get("#result").contains("Timeout! TestParam");
    });
});
