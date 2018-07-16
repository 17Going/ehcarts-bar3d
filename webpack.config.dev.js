var webpack = require('webpack');
module.exports = {
    mode: 'development',
    entry: {
        'echarts-graph3d': __dirname + '/index.js'
    },
    plugins: [
        new webpack.DefinePlugin({
            'typeof __DEV__': JSON.stringify('boolean'),
            __DEV__: true
        })
    ],
    output: {
        libraryTarget: 'umd',
        library: 'echarts-graph3d',
        path: __dirname + '/dist',
        filename: '[name].js'
    },
    externals: {
        'echarts/lib/echarts': 'echarts'
    },
    resolve: {
        alias: {
            'echarts/lib/echarts': 'echarts'
        }
    }
};
