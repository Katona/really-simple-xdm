describe("Messages", () => {
    it("should appear on load", () => {
        cy.visit("http://localhost:8080/client_server");
        cy.get("#result").contains("2");
    });
});
