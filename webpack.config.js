const path = require("path");

module.exports = {
    output: {
        library: "rsx",
        libraryTarget: "umd",
        filename: "index.js",
        path: path.resolve(__dirname, "build/dist")
    },
    devServer: {
        contentBase: "cypress/integration",
        port: 8080
    }
};
