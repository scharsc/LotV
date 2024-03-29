const { merge } = require("webpack-merge");
const base = require("./base.js");

module.exports = merge(base, {
  mode: "development",
  devtool: "inline-source-map",
  devServer: {
    compress: true,
    port: 9000,
  },
});
