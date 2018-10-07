module.exports = {
    output: {
        library: "xdmjs",
        libraryTarget: "umd",
        filename: "index.js"
    },
    devServer: {
        contentBase: "cypress/integration"
    }
};
