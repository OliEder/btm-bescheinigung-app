const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: './js/app.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.[contenthash].js',
        // Relativer publicPath, damit die App sowohl unter der Domain-Root (lokal)
        // als auch in einem Unterpfad (GitHub Pages: /<repo>/) funktioniert.
        // Über PUBLIC_PATH überschreibbar, falls ein absoluter Pfad nötig ist.
        publicPath: process.env.PUBLIC_PATH || '',
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
