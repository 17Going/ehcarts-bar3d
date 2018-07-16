var echarts = _echarts3;//require('echarts/lib/echarts');

module.exports = echarts.extendSeriesModel({

    type: 'series.bar3d',

    dependencies: ['grid', 'polar'],

    brushSelector: 'rect',

    getInitialData: function (option, ecModel) {
        return echarts.helper.createList(this);
    },

    getMarkerPosition: function (value) {
        var coordSys = this.coordinateSystem;
        if (coordSys) {
            // PENDING if clamp ?
            var pt = coordSys.dataToPoint(value, true);
            var data = this.getData();
            var offset = data.getLayout('offset');
            var size = data.getLayout('size');
            var offsetIndex = coordSys.getBaseAxis().isHorizontal() ? 0 : 1;
            pt[offsetIndex] += offset + size / 2;
            return pt;
        }
        return [NaN, NaN];
    },

    defaultOption: {
        barType: 'cube', // 柱状图的柱子类型 cube | cylinder
        zlevel: 0,                  // 一级层叠
        z: 2,                       // 二级层叠
        coordinateSystem: 'cartesian2d',
        legendHoverLink: true,
        barMinHeight: 0,

        itemStyle: {
            normal: {
                // color: '各异'
            },
            emphasis: {}
        }
    }
});