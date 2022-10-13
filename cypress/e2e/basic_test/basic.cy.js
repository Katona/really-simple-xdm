describe("Messages", () => {
    it("should appear on load", () => {
        cy.visit("http://localhost:8080/basic_test");
        cy.get("#result").contains("2");
    });
});
