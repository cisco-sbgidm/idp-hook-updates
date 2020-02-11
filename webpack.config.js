const path = require('path');
const nodeExternals = require('webpack-node-externals');
module.exports = {
    entry: './src/setupDuoScript/SetupDuo.ts',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader'
            },
        ],
    },
    resolve: {
        extensions: [ '.tsx', '.ts', '.js' ],
    },
    target: 'node',
    externals: [nodeExternals()],
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'setupDuo.bundle.js'
    }
};