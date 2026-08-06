const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: './js/app.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.[contenthash].js',
        clean: true,
    },
    module: {
        rules: [
            { test: /\.css$/i, use: ['style-loader', 'css-loader'] },
            { test: /\.pdf$/i, type: 'asset/resource' },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({ template: 'src/index.template.html' }),
    ],
    resolve: { extensions: ['.js'] },
    devServer: {
        static: path.resolve(__dirname, 'dist'),
        port: 8080,
        open: true,
    },
};
