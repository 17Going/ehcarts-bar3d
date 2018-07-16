var webpack = require('webpack');

console.log(webpack.DefinePlugin)

module.exports = {
    mode: 'production',
    entry: {
        'echarts-bar3d': __dirname + '/index.js'
    },
    plugins: [
        new webpack.DefinePlugin({
            'typeof __DEV__': JSON.stringify('boolean'),
            __DEV__: false
        })
    ],
    output: {
        libraryTarget: 'umd',
        library: ['echarts-bar3d'],
        path: __dirname + '/dist',
        filename: '[name].min.js'
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
