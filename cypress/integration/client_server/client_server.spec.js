describe("Messages", () => {
    it("should appear on load", () => {
        cy.visit("http://localhost:8080/full");
        cy.get("#result").contains("2");
    });
});
