describe("Messages", () => {
    it("should appear on load", () => {
        // This test definitely needs improvement
        cy.visit("http://localhost:8080/callback_test");
        cy.get("#result").contains("2");
    });
});
