var echarts = require('echarts/lib/echarts');
var AxisBuilder = require("echarts/lib/component/axis/AxisBuilder");
var AxisView = require("echarts/lib/component/axis/AxisView");
var zrUtil = require("zrender/lib/core/util");

var graphic = echarts.graphic;
var ifIgnoreOnTick = AxisBuilder.ifIgnoreOnTick;
var getInterval = AxisBuilder.getInterval;
var axisBuilderAttrs = ['axisLine', 'axisTickLabel', 'axisName'];
var selfBuilderAttrs = ['splitArea', 'splitLine'];


function layoutFn(gridModel, axisModel, opt) {
    opt = opt || {};
    var grid = gridModel.coordinateSystem;
    var axis = axisModel.axis;
    var layout = {};
    var rawAxisPosition = axis.position;
    var axisPosition = axis.onZero ? 'onZero' : rawAxisPosition;
    var axisDim = axis.dim;
    var rect = grid.getRect();
    var rectBound = [rect.x, rect.x + rect.width, rect.y, rect.y + rect.height];
    var idx = {
        left: 0,
        right: 1,
        top: 0,
        bottom: 1,
        onZero: 2
    };
    var axisOffset = axisModel.get('offset') || 0;
    var posBound = axisDim === 'x3d' ? [rectBound[2] - axisOffset, rectBound[3] + axisOffset] : [rectBound[0] - axisOffset, rectBound[1] + axisOffset];

    if (axis.onZero) {
        var otherAxis = grid.getAxis(axisDim === 'x3d' ? 'y3d' : 'x3d', axis.onZeroAxisIndex);
        var onZeroCoord = otherAxis.toGlobalCoord(otherAxis.dataToCoord(0));
        posBound[idx['onZero']] = Math.max(Math.min(onZeroCoord, posBound[1]), posBound[0]);
    } // Axis position


    layout.position = [axisDim === 'y3d' ? posBound[idx[axisPosition]] : rectBound[0], axisDim === 'x3d' ? posBound[idx[axisPosition]] : rectBound[3]]; // Axis rotation

    layout.rotation = Math.PI / 2 * (axisDim === 'x3d' ? 0 : 1); // Tick and label direction, x y is axisDim

    var dirMap = {
        top: -1,
        bottom: 1,
        left: -1,
        right: 1
    };
    layout.labelDirection = layout.tickDirection = layout.nameDirection = dirMap[rawAxisPosition];
    layout.labelOffset = axis.onZero ? posBound[idx[rawAxisPosition]] - posBound[idx['onZero']] : 0;

    if (axisModel.get('axisTick.inside')) {
        layout.tickDirection = -layout.tickDirection;
    }

    if (zrUtil.retrieve(opt.labelInside, axisModel.get('axisLabel.inside'))) {
        layout.labelDirection = -layout.labelDirection;
    } // Special label rotation


    var labelRotate = axisModel.get('axisLabel.rotate');
    layout.labelRotate = axisPosition === 'top' ? -labelRotate : labelRotate; // label interval when auto mode.

    layout.labelInterval = axis.getLabelInterval(); // Over splitLine and splitArea

    layout.z2 = 1;
    return layout;
}

/**
 * 通过全局模型获取柱宽，再通过一定算法得到偏移量
 * @param {Global} ecModel 
 */
function getSplitLineOffset(ecModel){
    var seriesModel = ecModel.getSeriesByType('bar3d')[0];
    if(!seriesModel){
        return null;
    }
    var cartesian = seriesModel.coordinateSystem;
    var barLength = seriesModel.get('barLength') || 0; 
    var baseAxis = cartesian.getBaseAxis();
    var isHorizontal = baseAxis.isHorizontal();
    var data = seriesModel.getData();
    var layout = data.getItemLayout(0);


    return isHorizontal ? cvtOffset(Math.max(layout.width, barLength)) :
        cvtOffset(Math.max(layout.height, barLength));
}

/**
 * 根据立方体柱子的算法来转换宽度得到偏移量
 * @param {Number} barWidth 
 */
function cvtOffset(barWidth) {
    return barWidth*Math.sin(Math.PI/4)/2
}

var CartesianAxisView = echarts.extendComponentView({
    type: 'cartesian3dAxis',
    axisPointerClass: 'CartesianAxisPointer',

    /**
     * @override
     */
    render: function (axisModel, ecModel, api, payload) {
        this.group.removeAll();
        var oldAxisGroup = this._axisGroup;
        this._axisGroup = new graphic.Group();
        this.group.add(this._axisGroup);

        if (!axisModel.get('show')) {
            return;
        }

        var gridModel = axisModel.getCoordSysModel();
        var layout = layoutFn(gridModel, axisModel);
        var axisBuilder = new AxisBuilder(axisModel, layout);
        zrUtil.each(axisBuilderAttrs, axisBuilder.add, axisBuilder);

        this._axisGroup.add(axisBuilder.getGroup());

        zrUtil.each(selfBuilderAttrs, function (name) {
            if (axisModel.get(name + '.show')) {
                this['_' + name](axisModel, gridModel, layout.labelInterval, ecModel);
            }
        }, this);
        graphic.groupTransition(oldAxisGroup, this._axisGroup, axisModel);
        CartesianAxisView.superCall(this, 'render', axisModel, ecModel, api, payload);
    },

    /**
     * @param {module:echarts/coord/cartesian/AxisModel} axisModel
     * @param {module:echarts/coord/cartesian/GridModel} gridModel
     * @param {number|Function} labelInterval
     * @private
     */
    _splitLine: function (axisModel, gridModel, labelInterval, ecModel) {
        var axis = axisModel.axis;

        if (axis.scale.isBlank()) {
            return;
        }

        var splitLineModel = axisModel.getModel('splitLine');
        //首先通过计算得到坐标偏移量，得不到使用设置
        var offset = getSplitLineOffset(ecModel) || splitLineModel.get('offset');
        var lineStyleModel = splitLineModel.getModel('lineStyle');
        var lineColors = lineStyleModel.get('color');
        var lineInterval = getInterval(splitLineModel, labelInterval);
        lineColors = zrUtil.isArray(lineColors) ? lineColors : [lineColors];
        var gridRect = gridModel.coordinateSystem.getRect();
        var isHorizontal = axis.isHorizontal();
        var lineCount = 0;
        var ticksCoords = axis.getTicksCoords();
        var ticks = axis.scale.getTicks();
        var showMinLabel = axisModel.get('axisLabel.showMinLabel');
        var showMaxLabel = axisModel.get('axisLabel.showMaxLabel');
        var p1 = [];
        var p2 = []; // Simple optimization
        var p3 = []; 
        // Batching the lines if color are the same

        var lineStyle = lineStyleModel.getLineStyle();

        for (var i = 0; i < ticksCoords.length; i++) {
            if (ifIgnoreOnTick(axis, i, lineInterval, ticksCoords.length, showMinLabel, showMaxLabel)) {
                continue;
            }

            var tickCoord = axis.toGlobalCoord(ticksCoords[i]);

            if (isHorizontal) {
                p1[0] = tickCoord + offset;
                p1[1] = gridRect.y - offset;
                p2[0] = tickCoord + offset;
                p2[1] = gridRect.y + gridRect.height - offset;
                p3[0] = tickCoord;
                p3[1] = gridRect.y + gridRect.height;
            } else {
                p1[0] = gridRect.x;
                p1[1] = tickCoord;
                p2[0] = gridRect.x + offset;
                p2[1] = tickCoord - offset;
                p3[0] = gridRect.x + gridRect.width + offset;
                p3[1] = tickCoord - offset;
            }

            var colorIndex = lineCount++ % lineColors.length;
            this._axisGroup.add(new graphic.Line(graphic.subPixelOptimizeLine({
                anid: 'line_' + ticks[i],
                shape: {
                    x1: p1[0],
                    y1: p1[1],
                    x2: p2[0],
                    y2: p2[1]
                },
                style: zrUtil.defaults({
                    stroke: lineColors[colorIndex]
                }, lineStyle),
                silent: true
            })));

            this._axisGroup.add(new graphic.Line(graphic.subPixelOptimizeLine({
                anid: 'line_' + ticks[i] + '2',
                shape: {
                    x1: p2[0],
                    y1: p2[1],
                    x2: p3[0],
                    y2: p3[1]
                },
                style: zrUtil.defaults({
                    stroke: lineColors[colorIndex]
                }, lineStyle),
                silent: true
            })));
        }
    },

    /**
     * @param {module:echarts/coord/cartesian/AxisModel} axisModel
     * @param {module:echarts/coord/cartesian/GridModel} gridModel
     * @param {number|Function} labelInterval
     * @private
     */
    _splitArea: function (axisModel, gridModel, labelInterval) {
        var axis = axisModel.axis;

        if (axis.scale.isBlank()) {
            return;
        }

        var splitAreaModel = axisModel.getModel('splitArea');
        var areaStyleModel = splitAreaModel.getModel('areaStyle');
        var areaColors = areaStyleModel.get('color');
        var gridRect = gridModel.coordinateSystem.getRect();
        var ticksCoords = axis.getTicksCoords();
        var ticks = axis.scale.getTicks();
        var prevX = axis.toGlobalCoord(ticksCoords[0]);
        var prevY = axis.toGlobalCoord(ticksCoords[0]);
        var count = 0;
        var areaInterval = getInterval(splitAreaModel, labelInterval);
        var areaStyle = areaStyleModel.getAreaStyle();
        areaColors = zrUtil.isArray(areaColors) ? areaColors : [areaColors];
        var showMinLabel = axisModel.get('axisLabel.showMinLabel');
        var showMaxLabel = axisModel.get('axisLabel.showMaxLabel');

        for (var i = 1; i < ticksCoords.length; i++) {
            if (ifIgnoreOnTick(axis, i, areaInterval, ticksCoords.length, showMinLabel, showMaxLabel)) {
                continue;
            }

            var tickCoord = axis.toGlobalCoord(ticksCoords[i]);
            var x;
            var y;
            var width;
            var height;

            if (axis.isHorizontal()) {
                x = prevX;
                y = gridRect.y;
                width = tickCoord - x;
                height = gridRect.height;
            } else {
                x = gridRect.x;
                y = prevY;
                width = gridRect.width;
                height = tickCoord - y;
            }

            var colorIndex = count++ % areaColors.length;

            this._axisGroup.add(new graphic.Rect({
                anid: 'area_' + ticks[i],
                shape: {
                    x: x,
                    y: y,
                    width: width,
                    height: height
                },
                style: zrUtil.defaults({
                    fill: areaColors[colorIndex]
                }, areaStyle),
                silent: true
            }));

            prevX = x + width;
            prevY = y + height;
        }
    }
});

zrUtil.inherits(CartesianAxisView, AxisView);

CartesianAxisView.extend({
    type: 'x3dAxis'
});

CartesianAxisView.extend({
    type: 'y3dAxis'
});

module.exports = CartesianAxisView;