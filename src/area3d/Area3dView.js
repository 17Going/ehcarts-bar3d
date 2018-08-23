
var echarts = _echarts3;
var graphic = echarts.graphic;
var zrUtil = echarts.util;

var _poly = require("./poly");
var Polygon = _poly.Polygon;
var PolygonOver = _poly.PolygonOver;

var SymbolDraw = require('./SymbolDraw');
var getBestLightColor = require('../util/util');

var TOP_FACE = 'topFace',
    TOP_FACE_2 = 'topFace2',
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
        var symbolDraw = new SymbolDraw();
        this.group.add(symbolDraw.group);
        this._symbolDraw = symbolDraw;
        this._lineGroup = new graphic.Group();
        this.group.add(this._lineGroup);
    },
    render: function (seriesModel, ecModel, api) {
        var coordSys = seriesModel.coordinateSystem;
        var oldData = this._data;
        var data = seriesModel.getData();
        var baseAxis = coordSys.getBaseAxis();
        var isHorizontal = baseAxis.isHorizontal();
        var hasAnimation = seriesModel.get('animation');

        var showSymbol = seriesModel.get('showSymbol');

        // 标注
        var symbolDraw = this._symbolDraw;
        if (!showSymbol) {
            symbolDraw.remove();
        }
        showSymbol && symbolDraw.updateData(data, false);

        // 绘制删除之前所有图形元素，避免重复绘制
        // group.removeAll();

        // 绘制
        createArea(this._lineGroup, data, coordSys, seriesModel, isHorizontal, hasAnimation);
        updateStyle(this._lineGroup, data, coordSys, seriesModel, isHorizontal);

        // data.diff(oldData)
        //     .add(function (dataIndex) {
        //         // console.log(dataIndex)
        //     })
        //     .update(function (newIndex, oldIndex) {
        //         console.log('update')
        //     })
        //     .remove(function (dataIndex) {
        //         console.log('remove')
        //     })
        //     .execute();
        this._data = data;
    },

    dispose: function () { },

    remove: function (ecModel) {
        // var group = this.group;
        // group.removeAll();
        this._lineGroup.removeAll();
        this._symbolDraw.remove(true);
    }
});


/**
 * 设置裁剪区域
 * @param {*} cartesian 
 * @param {*} hasAnimation 
 * @param {*} seriesModel 
 */
function createGridClipShape(cartesian, hasAnimation, seriesModel) {
    var faceWidth = seriesModel.get('faceWidth');
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
        y -= expandSize + faceWidth;
        height += (expandSize * 2 + faceWidth);
        width += faceWidth;
    } else {
        x -= expandSize;
        width += (expandSize * 2 + faceWidth);
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

/**
 * 获取曲线圆滑程度 （0~1）
 * @param {Number|Boolean} smooth 
 */
function getSmooth(smooth) {
    return typeof smooth === 'number' ? smooth : smooth ? 0.3 : 0;
}

/**
 * 创建2.5绘制面
 * @param {*} g 
 * @param {*} Poly 
 * @param {*} name 
 * @param {*} shape 
 * @param {*} smooth 
 * @param {*} z2 
 * @param {*} seriesModel 
 */
function createShape(g, Poly, name, shape, smooth, z2, seriesModel) {
    var graph;
    if (graph = g.childOfName(name)) {
        // graphic.updateProps(graph, {
        //     shape: shape
        // }, seriesModel);
        graph.setShape(shape);
    } else {
        graph = new Poly({
            name: name,
            shape: zrUtil.defaults({
                smooth: smooth,
                stackedOnSmooth: smooth
            }, shape),
            z2: z2
        });

        g.add(graph);
    }
}

/**
 * 绘制3d面积图
 * @param {Model} data 
 * @param {Object} coordSys 
 * @param {Model} seriesModel 
 * @param {Boolean} isHorizontal 
 */
function createArea(g, data, coordSys, seriesModel, isHorizontal, hasAnimation) {
    var count = g.childCount();
    // 获取面宽
    var faceWidth = seriesModel.get('faceWidth');

    //获取点数据
    var points = data.mapArray(data.getItemLayout, true);
    // 上升点
    var upPoints = points.map(function (item, index) {
        return getPoint(item, index, faceWidth, isHorizontal);
    });

    // 获取坐标轴上的坐标点
    var stackedOnPoints = getStackedOnPoints(coordSys, data);
    // 上升点
    var upStackedOnPoints = stackedOnPoints.map(function (item, index) {
        return getPoint(item, index, faceWidth, isHorizontal);
    });

    var len = points.length;
    var firstIndex = 0;
    var lastIndex = len - 1;
    var smooth = seriesModel.get('smooth');
    smooth = getSmooth(seriesModel.get('smooth'));


    var shape = {
        points: points,
        stackedOnPoints: upPoints
    };

    // 绘制顶面
    createShape(g, PolygonOver, TOP_FACE, shape, smooth, 11, seriesModel);

    // 顶面2，绘制顶面1无法填充的地方
    createShape(g, Polygon, TOP_FACE_2, shape, smooth, 10, seriesModel);


    // 绘制左侧面（看不见先不绘制）
    /* createShape(g, Polygon, LEFT_FACE, {
        points: [points[firstIndex], upPoints[firstIndex]],
        stackedOnPoints: [stackedOnPoints[firstIndex], upStackedOnPoints[firstIndex]]
    }, smooth, 5, seriesModel);*/

    // 绘制右侧面
    createShape(g, Polygon, RIGHT_FACE, {
        points: points[lastIndex] ? [points[lastIndex], upPoints[lastIndex]] : [],
        stackedOnPoints: stackedOnPoints[lastIndex] ? [stackedOnPoints[lastIndex], upStackedOnPoints[lastIndex]] : []
    }, smooth, 12, seriesModel);

    //绘制正面
    createShape(g, Polygon, FRONT_FACE, {
        points: points,
        stackedOnPoints: stackedOnPoints
    }, smooth, 12, seriesModel);

    // 绘制背面(看不见)
    /*createShape(g, Polygon, BACK_FACE, {
        points: upPoints,
        stackedOnPoints: upStackedOnPoints
    }, smooth, 0, seriesModel);*/

    g.setClipPath(createGridClipShape(coordSys, !count ? hasAnimation : false, seriesModel));
}

/**
 * 计算上升点坐标
 * @param {Array} point 
 * @param {Number} faceWidth 
 * @param {Boolean} isHorizontal 
 */
function getPoint(point, index, faceWidth, isHorizontal) {
    return isHorizontal ? [point[0] + faceWidth, point[1] - faceWidth]
        : [point[0] + faceWidth, point[1] + faceWidth];
}


/**
 * 颜色变暗
 * @param {0~1} level 
 * @param {color} color 
 */
function lerpColor(color, level) {
    var colorUtil = echarts.color;
    if (!zrUtil.isString(color)) {
        return color;
    }
    return colorUtil.lerp(level, [color, '#000']);
}

/**
 * 颜色高亮
 * @param {String|Object} color 
 * @param {Number| -1~1} level 
 */
function liftColor(color, level) {
    var colorUtil = echarts.color;
    if (typeof color == 'string') {
        return colorUtil.lift(color, level)
    } else {
        // 设置的是渐变色,不改变
        return color;
    }
}

/**
 * 根据最后一个值得大小来计算右侧面的颜色渐变(开始渐变色)
 * 注：目前只支持上下渐变
 * @param {*} color 
 * @param {*} data 
 * @param {*} coordSys 
 * @param {*} isHorizontal 
 */
function getGradientColor(color, data, coordSys, isHorizontal) {
    color = zrUtil.clone(color);
    var colorUtil = echarts.color;

    if(!color) { // 未设置颜色时返回
        return;
    }

    // 不是渐变色不需要处理
    if (zrUtil.isString(color)) {
        return lerpColor(color, 0.2);
    }

    var colorStops = color.colorStops;
    var startColor, startIndex;
    var endColor;
    for (var i = 0, len = colorStops.length; i < len; i++) {
        if (colorStops[i].offset == 0) {
            startColor = colorStops[i].color;
            startIndex = i;
        }

        if (colorStops[i].offset == 1) {
            endColor = colorStops[i].color;
        }

        if (startColor && endColor) {
            break;
        }
    }

    // 如果未设置开始渐变颜色则返回
    if (!startColor || !endColor) {
        return color;
    }

    var points = data.mapArray(data.getItemLayout, true);
    var len = points.length;
    var baseAxis = coordSys.getBaseAxis();
    var valueAxis = coordSys.getOtherAxis(baseAxis);
    var height = valueAxis.toGlobalCoord(0);

    var value = 0;
    if (isHorizontal && points[len -1]) {
        value = points[len - 1][1];
    }
    var level = Math.abs(value / height);// 计算坐标所在位置是坐标系中的什么位置
    startColor = colorUtil.lerp(level, [startColor, endColor]);
    colorStops[startIndex].color = startColor;

    return color;
}

/**
 * 设置图形样式
 * @param {*} g 
 * @param {*} name 
 * @param {*} areaStyle 
 * @param {*} options 
 */
function setStyle(g, name, areaStyle, options) {
    g.childOfName(name).useStyle(zrUtil.defaults(
        options,
        areaStyle
    ));
}

/**
 * 设置图形样式（上色、透明）
 * @param {*} g 
 * @param {*} data 
 * @param {*} coordSys 
 * @param {*} itemModel 
 * @param {*} isHorizontal 
 */
function updateStyle(g, data, coordSys, itemModel, isHorizontal) {
    var itemStyleModel = itemModel.getModel('itemStyle.normal');
    var visualColor = data.getVisual('color');
    var itemStyle = itemStyleModel.getItemStyle();
    var color = itemStyle.fill || visualColor;

    var rightColor = getGradientColor(color, data, coordSys, isHorizontal);
    var topColor = getBestLightColor(color);

    // 设置顶面的样式
    setStyle(g, TOP_FACE, itemStyle, {
        fill: liftColor(topColor, 0.2),
        stroke: 'none'
    });

    setStyle(g, TOP_FACE_2, itemStyle, {
        fill: liftColor(topColor, 0.2)
    });

    // 设置正面样式
    setStyle(g, FRONT_FACE, itemStyle, {
        fill: color,
        // opacity: 1
    });

    // 设置右侧面样式
    setStyle(g, RIGHT_FACE, itemStyle, {
        fill: rightColor
    });
}

module.exports = _default;