// 注意：UE中使用多个版本导致echarts依赖有问题
var echarts = _echarts3;

require('./bar3d/Bar3dSeries');
require('./bar3d/Bar3dView');

var barLayoutGrid = require("echarts/lib/layout/barGrid");

echarts.registerLayout(echarts.util.curry(barLayoutGrid, 'bar3d'));

echarts.registerVisual(function (ecModel) {
    ecModel.eachSeriesByType('bar3d', function (seriesModel) {
        var data = seriesModel.getData();
        data.setVisual('legendSymbol', 'roundRect');
    });
});
