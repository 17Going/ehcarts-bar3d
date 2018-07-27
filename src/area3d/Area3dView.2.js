var echarts = require('echarts/lib/echarts');
var graphic = echarts.graphic;
var zrUtil = echarts.util;

var _poly = require("./poly");

var Polyline = _poly.Polyline;
var Polygon = _poly.Polygon;

var TOP_FACE = 'topFace',
    RIGHT_FACE = 'rightFace',
    LEFT_FACE = 'leftFace',
    FRONT_FACE = 'frontFace',
    BACK_FACE = 'backFace';


zrUtil.extend(echarts.Model.prototype, require('./Area3dStyle'));



/**
 * 扩展2.5d面积图
 */
var _default = echarts.extendChartView({
    type: 'area3d',
    init: function () {

    },
    render: function (seriesModel, ecModel, api) {
        var coordSys = seriesModel.coordinateSystem;
        var oldData = this._data;
        var group = this.group;
        var data = seriesModel.getData();
        var baseAxis = coordSys.getBaseAxis();
        var isHorizontal = baseAxis.isHorizontal();
        var hasAnimation = seriesModel.get('animation');

        // 绘制删除之前所有图形元素，避免重复绘制
        // group.removeAll();

        // 绘制
        var g = createArea(group, data, coordSys, seriesModel, isHorizontal);

        group.add(g);
        updateStyle(g, data, coordSys, seriesModel)
        g.setClipPath(createGridClipShape(coordSys, hasAnimation, seriesModel));

        data.diff(oldData)
            .add(function (dataIndex) {
                console.log('add')
            })
            .update(function (newIndex, oldIndex) {
                console.log('update')
            })
            .remove(function (dataIndex) {
                console.log('remove')
            })
            .execute();
        this._data = data;
    },

    dispose: function () { },

    remove: function (ecModel) {
        var group = this.group;
        group.removeAll();
    }
});


/**
 * 设置裁剪区域
 * @param {*} cartesian 
 * @param {*} hasAnimation 
 * @param {*} seriesModel 
 */
function createGridClipShape(cartesian, hasAnimation, seriesModel) {
    var faceWidth = seriesModel.get('areaStyle.normal.faceWidth');
    var xExtent = getAxisExtentWithGap(cartesian.getAxis('x'));
    var yExtent = getAxisExtentWithGap(cartesian.getAxis('y'));
    var isHorizontal = cartesian.getBaseAxis().isHorizontal();
    var x = Math.min(xExtent[0], xExtent[1]);
    var y = Math.min(yExtent[0], yExtent[1]);
    var width = Math.max(xExtent[0], xExtent[1]) - x;
    var height = Math.max(yExtent[0], yExtent[1]) - y;
    var lineWidth = seriesModel.get('lineStyle.normal.width') || 2; // Expand clip shape to avoid clipping when line value exceeds axis

    var expandSize = seriesModel.get('clipOverflow') ? lineWidth / 2 : Math.max(width, height);

    if (isHorizontal) {
        y -= expandSize;
        height += expandSize * 2;
        width += faceWidth;
    } else {
        x -= expandSize;
        width += expandSize * 2;
        height += faceWidth;
    }

    var clipPath = new graphic.Rect({
        shape: {
            x: x,
            y: y,
            width: width,
            height: height
        }
    });

    if (hasAnimation) {
        clipPath.shape[isHorizontal ? 'width' : 'height'] = 0;
        graphic.initProps(clipPath, {
            shape: {
                width: width,
                height: height
            }
        }, seriesModel);
    }

    return clipPath;
}

function getAxisExtentWithGap(axis) {
    var extent = axis.getGlobalExtent();

    if (axis.onBand) {
        // Remove extra 1px to avoid line miter in clipped edge
        var halfBandWidth = axis.getBandWidth() / 2 - 1;
        var dir = extent[1] > extent[0] ? 1 : -1;
        extent[0] += dir * halfBandWidth;
        extent[1] -= dir * halfBandWidth;
    }

    return extent;
}

/**
 * 通过坐标轴和点数据，计算对应的坐标轴上点的数据数据，用于绘制面积
 * @param {CoordSys} coordSys 
 * @param {Model} data 
 */
function getStackedOnPoints(coordSys, data) {
    var baseAxis = coordSys.getBaseAxis();
    var valueAxis = coordSys.getOtherAxis(baseAxis);
    var valueStart = 0;

    if (!baseAxis.onZero) {
        var extent = valueAxis.scale.getExtent();

        if (extent[0] > 0) {
            valueStart = extent[0];
        } else if (extent[1] < 0) {
            valueStart = extent[1];
        }
    }

    var valueDim = valueAxis.dim;
    var baseDataOffset = valueDim === 'x' || valueDim === 'radius' ? 1 : 0;
    return data.mapArray([valueDim], function (val, idx) {
        var stackedOnSameSign;
        var stackedOn = data.stackedOn; // Find first stacked value with same sign

        while (stackedOn && sign(stackedOn.get(valueDim, idx)) === sign(val)) {
            stackedOnSameSign = stackedOn;
            break;
        }

        var stackedData = [];
        stackedData[baseDataOffset] = data.get(baseAxis.dim, idx);
        stackedData[1 - baseDataOffset] = stackedOnSameSign ? stackedOnSameSign.get(valueDim, idx, true) : valueStart;
        return coordSys.dataToPoint(stackedData);
    }, true);
}

function sign(val) {
    return val >= 0 ? 1 : -1;
}

function getVisualGradient(data, coordSys) {
    var visualMetaList = data.getVisual('visualMeta');

    if (!visualMetaList || !visualMetaList.length || !data.count()) {
        // When data.count() is 0, gradient range can not be calculated.
        return;
    }

    var visualMeta;

    for (var i = visualMetaList.length - 1; i >= 0; i--) {
        // Can only be x or y
        if (visualMetaList[i].dimension < 2) {
            visualMeta = visualMetaList[i];
            break;
        }
    }

    if (!visualMeta || coordSys.type !== 'cartesian2d') {
        return;
    } // If the area to be rendered is bigger than area defined by LinearGradient,
    // the canvas spec prescribes that the color of the first stop and the last
    // stop should be used. But if two stops are added at offset 0, in effect
    // browsers use the color of the second stop to render area outside
    // LinearGradient. So we can only infinitesimally extend area defined in
    // LinearGradient to render `outerColors`.


    var dimension = visualMeta.dimension;
    var dimName = data.dimensions[dimension];
    var axis = coordSys.getAxis(dimName); // dataToCoor mapping may not be linear, but must be monotonic.

    var colorStops = zrUtil.map(visualMeta.stops, function (stop) {
        return {
            coord: axis.toGlobalCoord(axis.dataToCoord(stop.value)),
            color: stop.color
        };
    });
    var stopLen = colorStops.length;
    var outerColors = visualMeta.outerColors.slice();

    if (stopLen && colorStops[0].coord > colorStops[stopLen - 1].coord) {
        colorStops.reverse();
        outerColors.reverse();
    }

    var tinyExtent = 10; // Arbitrary value: 10px

    var minCoord = colorStops[0].coord - tinyExtent;
    var maxCoord = colorStops[stopLen - 1].coord + tinyExtent;
    var coordSpan = maxCoord - minCoord;

    if (coordSpan < 1e-3) {
        return 'transparent';
    }

    zrUtil.each(colorStops, function (stop) {
        stop.offset = (stop.coord - minCoord) / coordSpan;
    });
    colorStops.push({
        offset: stopLen ? colorStops[stopLen - 1].offset : 0.5,
        color: outerColors[1] || 'transparent'
    });
    colorStops.unshift({
        // notice colorStops.length have been changed.
        offset: stopLen ? colorStops[0].offset : 0.5,
        color: outerColors[0] || 'transparent'
    }); // zrUtil.each(colorStops, function (colorStop) {
    //     // Make sure each offset has rounded px to avoid not sharp edge
    //     colorStop.offset = (Math.round(colorStop.offset * (end - start) + start) - start) / (end - start);
    // });

    var gradient = new graphic.LinearGradient(0, 0, 0, 0, colorStops, true);
    gradient[dimName] = minCoord;
    gradient[dimName + '2'] = maxCoord;
    return gradient;
}

/**
 * 获取曲线圆滑程度 （0~1）
 * @param {Number|Boolean} smooth 
 */
function getSmooth(smooth) {
    return typeof smooth === 'number' ? smooth : smooth ? 0.3 : 0;
}


/**
 * 绘制3d面积图
 * @param {Model} data 
 * @param {Object} coordSys 
 * @param {Model} seriesModel 
 * @param {Boolean} isHorizontal 
 */
function createArea(wrap, data, coordSys, seriesModel, isHorizontal) {
    var areaStyleModel = seriesModel.getModel('areaStyle.normal');
    // 获取面宽
    var faceWidth = areaStyleModel.get('faceWidth');
    // 创建一个组来绘制图形
    var g = new graphic.Group();
    //获取点数据
    var points = data.mapArray(data.getItemLayout, true);
    // 上升点
    var upPoints = points.map(function (item) {
        return getPoint(item, faceWidth, isHorizontal);
    });
    // 获取坐标轴上的坐标点
    var stackedOnPoints = getStackedOnPoints(coordSys, data);
    // 上升点
    var upStackedOnPoints = stackedOnPoints.map(function (item) {
        return getPoint(item, faceWidth, isHorizontal);
    });

    var len = points.length;
    var firstIndex = 0;
    var lastIndex = len - 1;
    var smooth = seriesModel.get('smooth');
    smooth = getSmooth(seriesModel.get('smooth'));

    // 绘制顶面
    var topFace = new Polygon({
        name: TOP_FACE,
        shape: {
            points: points,
            stackedOnPoints: upPoints,
            smooth: smooth,
            stackedOnSmooth: smooth,
        },
        z2: 10
    });
    g.add(topFace);

    // 绘制右侧面
    var leftFace = new Polygon({
        name: LEFT_FACE,
        shape: {
            points: [points[firstIndex], upPoints[firstIndex]],
            stackedOnPoints: [stackedOnPoints[firstIndex], upStackedOnPoints[firstIndex]],
            smooth: smooth,
            stackedOnSmooth: smooth
        },
        z2: 5
    });
    g.add(leftFace);

    // 绘制左侧面
    var rightFace = new Polygon({
        name: RIGHT_FACE,
        shape: {
            points: [points[lastIndex], upPoints[lastIndex]],
            stackedOnPoints: [stackedOnPoints[lastIndex], upStackedOnPoints[lastIndex]],
            smooth: smooth,
            stackedOnSmooth: smooth
        },
        z2: 5
    });
    g.add(rightFace);

    //绘制正面
    var frontFace = new Polygon({
        name: FRONT_FACE,
        shape: {
            points: points,
            stackedOnPoints: stackedOnPoints,
            smooth: smooth,
            stackedOnSmooth: smooth
        },
        z2: 10
    });
    g.add(frontFace);

    // 绘制背面
    var backFace = new Polygon({
        name: BACK_FACE,
        shape: {
            points: upPoints,
            stackedOnPoints: upStackedOnPoints,
            smooth: smooth,
            stackedOnSmooth: smooth
        }
    });
    g.add(backFace);
    return g;
}

/**
 * 计算上升点坐标
 * @param {Array} point 
 * @param {Number} faceWidth 
 * @param {Boolean} isHorizontal 
 */
function getPoint(point, faceWidth, isHorizontal) {
    return isHorizontal ? [point[0] + faceWidth, point[1] - faceWidth]
        : [point[0] + faceWidth, point[1] + faceWidth];
}


function updateStyle(g, data, coordSys, itemModel) {
    var areaStyleModel = itemModel.getModel('areaStyle.normal');
    var visualColor = getVisualGradient(data, coordSys) || data.getVisual('color');
    var topFaceColor = areaStyleModel.get('topFaceColor');

    // 获取设置的颜色值
    var defaultsStyle = zrUtil.defaults(
        areaStyleModel.getArea3dStyle(),
        {
            fill: visualColor,
            stroke: 'none',
            lineJoin: 'bevel'
        }
    );

    g.childOfName(TOP_FACE).useStyle(zrUtil.defaults({ opacity: 0.55, fill: topFaceColor }, defaultsStyle));
    g.childOfName(BACK_FACE).useStyle(zrUtil.defaults({ opacity: 0.1 }, defaultsStyle));
    g.childOfName(FRONT_FACE).useStyle(zrUtil.defaults({ opacity: 0.45 }, defaultsStyle));

    g.childOfName(RIGHT_FACE).useStyle(zrUtil.defaults({ opacity: 0.15 }, defaultsStyle));
    g.childOfName(LEFT_FACE).useStyle(zrUtil.defaults({ opacity: 0.2 }, defaultsStyle));
}

module.exports = _default;