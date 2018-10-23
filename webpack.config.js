module.exports = {
    output: {
        library: "rsx",
        libraryTarget: "umd",
        filename: "index.js"
    },
    devServer: {
        contentBase: "cypress/integration",
        port: 8080
    }
};
