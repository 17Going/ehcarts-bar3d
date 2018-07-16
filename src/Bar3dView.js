var echarts = _echarts3;//require('echarts/lib/echarts');
var zrUtil = echarts.util;
var graphic = echarts.graphic;
var helper = require('./helper');
var colorTool = require('zrender/lib/tool/color');
var BAR_BORDER_WIDTH_QUERY = ['itemStyle', 'normal', 'barBorderWidth'];
var graph = require('./bar3dLayout');


zrUtil.extend(require('echarts/lib/model/Model').prototype, require('./barItemStyle'));

var BarView = echarts.extendChartView({

    type: 'bar3d',

    render: function (seriesModel, ecModel, api) {
        var coordinateSystemType = seriesModel.get('coordinateSystem');

        if (coordinateSystemType === 'cartesian2d') {
            this._renderOnCartesian(seriesModel, ecModel, api);
        }

        return this.group;
    },

    _renderOnCartesian: function (seriesModel, ecModel, api) {
        var group = this.group;
        var data = seriesModel.getData();
        var oldData = this._data;
        var cartesian = seriesModel.coordinateSystem;
        var baseAxis = cartesian.getBaseAxis();
        var isHorizontal = baseAxis.isHorizontal();
        var animationModel = seriesModel.isAnimationEnabled() ? seriesModel : null;
        var isCube = (seriesModel.get('barType') == 'cube'); // 获取柱状图柱子类型

        data.diff(oldData)
            .add(function (dataIndex) {
                if (!data.hasValue(dataIndex)) {
                    return;
                }

                var itemModel = data.getItemModel(dataIndex);
                var layout = getRectItemLayout(data, dataIndex, itemModel);
                var el = isCube ?
                    createCube(data, dataIndex, itemModel, layout, isHorizontal, animationModel) :
                    createCylinder(data, dataIndex, itemModel, layout, isHorizontal, animationModel);

                data.setItemGraphicEl(dataIndex, el);
                group.add(el);

                isCube ? updateCubeStyle(el, data, dataIndex, itemModel, layout, seriesModel, isHorizontal) :
                    updateCylinderStyle(el, data, dataIndex, itemModel, layout, seriesModel, isHorizontal);
            })
            .update(function (newIndex, oldIndex) {
                var el = oldData.getItemGraphicEl(oldIndex);

                if (!data.hasValue(newIndex)) {
                    group.remove(el);
                    return;
                }

                var itemModel = data.getItemModel(newIndex);
                var layout = getRectItemLayout(data, newIndex, itemModel);

                if (el) {
                    isCube ? updateCube(el, layout, isHorizontal, animationModel, newIndex) :
                        updateCylinder(el, layout, isHorizontal, animationModel, newIndex);
                }
                else {
                    el = barType == 'cube' ?
                        createCube(data, newIndex, itemModel, layout, isHorizontal, animationModel, true) :
                        createCylinder(data, newIndex, itemModel, layout, isHorizontal, animationModel, true);
                }

                data.setItemGraphicEl(newIndex, el);
                group.add(el);

                isCube ? updateCubeStyle(el, data, newIndex, itemModel, layout, seriesModel, isHorizontal) :
                    updateCylinderStyle(el, data, newIndex, itemModel, layout, seriesModel, isHorizontal);
            })
            .remove(function (dataIndex) {
                var el = oldData.getItemGraphicEl(dataIndex);
                el && removeRect(dataIndex, animationModel, el);
            })
            .execute();

        this._data = data;
    },

    remove: function (ecModel, api) {
        var group = this.group;
        var data = this._data;
        if (ecModel.get('animation')) {
            if (data) {
                data.eachItemGraphicEl(function (el) {
                    removeRect(el.dataIndex, ecModel, el);
                });
            }
        }
        else {
            group.removeAll();
        }
    },

    dispose: function () { }
});


/**
 * 放大缩小时，更新立方体图形
 * @param {Group} el 
 * @param {Object} layout 
 * @param {Boolean} isHorizontal
 * @param {Object} animationModel 
 * @param {Number} newIndex 
 */
function updateCube(el, layout, isHorizontal, animationModel, newIndex) {
    var shape = zrUtil.extend({}, layout);
    var points = getPoints(shape, isHorizontal);

    el.eachChild(function (childEl) {
        if (childEl.location == 'top') {
            graphic.updateProps(childEl, { shape: getTopShape(shape, points, isHorizontal) }, animationModel, newIndex);
        } else if (childEl.location == 'bottom') {
            graphic.updateProps(childEl, { shape: getBottomShape(shape, points, isHorizontal) }, animationModel, newIndex);
        } else if (childEl.location == 'flank') {
            graphic.updateProps(childEl, { shape: getFlankShape(shape, points, isHorizontal) }, animationModel, newIndex);
        } else {
            graphic.updateProps(childEl, { shape: getFrontShape(shape, points, isHorizontal) }, animationModel, newIndex);
        }
    });
}

/**
 * 放大缩小时，更新圆柱体图形
 * @param {Group} el 
 * @param {Object} layout 
 * @param {Boolean} isHorizontal
 * @param {Object} animationModel 
 * @param {Number} newIndex 
 */
function updateCylinder(el, layout, isHorizontal, animationModel, newIndex) {
    var shape = zrUtil.extend({}, layout);

    el.eachChild(function (childEl) {
        if (childEl.location == 'top') {
            graphic.updateProps(childEl, { shape: getCylinderTop(shape, isHorizontal) }, animationModel, newIndex);
        } else if (childEl.location == 'bottom') {
            graphic.updateProps(childEl, { shape: getCylinderBottom(shape, isHorizontal) }, animationModel, newIndex);
        } else {
            graphic.updateProps(childEl, { shape: getCylinderFront(shape, isHorizontal) }, animationModel, newIndex);
        }
    });
}

/**
 * 绘制立方体
 * @param {null} data 
 * @param {Number} dataIndex 
 * @param {Object} itemModel 
 * @param {Object} layout 
 * @param {boolean} isHorizontal 
 * @param {Obj } animationModel 
 * @param {boolean} isUpdate 
 */
function createCube(data, dataIndex, itemModel, layout, isHorizontal, animationModel, isUpdate) {
    var g = new graphic.Group();
    g.isCube = true; // 设置是否立方体

    var shape = zrUtil.extend({}, layout);
    var points = getPoints(shape, isHorizontal);

    var bottom = new graph.Quadrangle({
        location: 'bottom',
        shape: getBottomShape(shape, points, isHorizontal)
    });

    // 创建顶面
    var top = new graph.Quadrangle({
        location: 'top',
        shape: getTopShape(shape, points, isHorizontal)
    });

    var front = new graph.Quadrangle({
        location: 'front',
        isHorizontal: isHorizontal,
        shape: getFrontShape(shape, points, isHorizontal)
    });

    var leftFlank = new graph.Quadrangle({
        location: 'flank',
        shape: getFlankShape(shape, points, isHorizontal)
    });

    var rightFlank = new graph.Quadrangle({
        location: 'flank',
        shape: getRightFlankShape(shape, points, isHorizontal)
    });

    g.add(rightFlank);
    g.add(bottom);
    g.add(top);
    g.add(leftFlank);
    g.add(front);

    // Animation
    if (animationModel) {
        // 顶面动画
        var topShape = top.shape;
        var animateProperty = isHorizontal ? 'y' : 'x';
        var animate2Property = isHorizontal ? 'y1' : 'x1';
        var animateTarget = {};

        animateTarget[animateProperty] = topShape[animateProperty];
        animateTarget[animate2Property] = topShape[animate2Property];

        topShape[animateProperty] = bottom.shape[animateProperty];
        topShape[animate2Property] = bottom.shape[animate2Property];

        graphic[isUpdate ? 'updateProps' : 'initProps'](top, {
            shape: animateTarget
        }, animationModel, dataIndex);

        // 正面动画
        var frontShape = front.shape;
        var animateProperty = isHorizontal ? 'height' : 'width';
        var animateTarget = {};

        animateTarget[animateProperty] = frontShape[animateProperty];
        frontShape[animateProperty] = 0;

        graphic[isUpdate ? 'updateProps' : 'initProps'](front, {
            shape: animateTarget
        }, animationModel, dataIndex);

        // 侧面动画
        var flankShape = leftFlank.shape;
        var animateProperty = isHorizontal ? 'height' : 'width';
        var animateTarget = {};
        animateTarget[animateProperty] = flankShape[animateProperty];
        flankShape[animateProperty] = 0;

        graphic[isUpdate ? 'updateProps' : 'initProps'](leftFlank, {
            shape: animateTarget
        }, animationModel, dataIndex);

        var flankShape = rightFlank.shape;
        var animateProperty = isHorizontal ? 'height' : 'width';
        var animateTarget = {};
        animateTarget[animateProperty] = flankShape[animateProperty];
        flankShape[animateProperty] = 0;

        graphic[isUpdate ? 'updateProps' : 'initProps'](rightFlank, {
            shape: animateTarget
        }, animationModel, dataIndex);
    }

    return g;
}

/**
 * 获取图形朝向
 * @param {Object} shape 
 * @param {Boolean} isHorizontal 
 */
function getAspect(shape, isHorizontal) {
    var isUp = true;

    if (isHorizontal && shape.height > 0) {
        isUp = false;
    } else if (!isHorizontal && shape.width < 0) {
        isUp = false;
    }

    return isUp;
}

/**
 * 获取绘制立方体面的8个点
 * @param {Object} shape 
 * @param {Boolean} isHorizontal 
 */
function getPoints(shape, isHorizontal) {
    var angle = Math.PI / 4;
    // 根据是横轴显示还是竖轴显示来计算x,y取整， 影响绘制图形（不取整）
    var x = isHorizontal ? Math.floor(shape.x) + 0.5 : shape.x,
        y = !isHorizontal ? Math.floor(shape.y) + 0.5 : shape.y,
        width = shape.width,
        height = shape.height,
        length = shape.length ? shape.length : (isHorizontal ? width : height);

    var r = length;
    var cosY = Math.floor(r * Math.cos(angle) / 2) + 0.5;
    var sinX = Math.floor(r * Math.sin(angle) / 2) + 0.5;

    // isHorizontal ? height = shape.height = (height + cosY/2): width = shape.width = (width - sinX/2);
    // isHorizontal ? x = x - sinX/2 : y = y + cosY/2;

    // 横着或者竖着点计算不一样
    return isHorizontal ? [
        [x, y], // 1
        [x + width, y], // 2 
        [x + width + sinX, y - cosY], // 3
        [x + sinX, y - cosY], // 4

        [x, y + height], // 5 
        [x + width, y + height], // 6
        [x + width + sinX, y - cosY + height], // 7
        [x + sinX, y - cosY + height] // 8
    ] : [
            [x, y + height], // 1
            [x, y], // 2 
            [x + sinX, y - cosY], // 3
            [x + sinX, y - cosY + height], // 4

            [x + width, y + height], // 5
            [x + width, y], // 6
            [x + sinX + width, y - cosY], // 7
            [x + sinX + width, y - cosY + height], // 8
        ];
}

/**
 * 获取立方体顶面图形参数
 * @param {Object} shape 
 * @param {Array} points 
 * @param {Boolean} isHorizontal 
 */
function getTopShape(shape, points, isHorizontal) {

    // 通过点1，点2，再根据宽，高获取其余2个点，设置宽高方便动画
    return isHorizontal ? {
        x: points[4][0],
        y: points[4][1],
        x1: points[7][0],
        y1: points[7][1],
        width: shape.width,
        height: 0,
        sw: shape.width,
        sh: shape.height
    } : {
            x: points[5][0],
            y: points[5][1],
            x1: points[6][0],
            y1: points[6][1],
            width: 0,
            height: shape.height,
            sw: shape.width,
            sh: shape.height
        };
}

/**
 * 获取立方体顶面图形参数
 * @param {Object} shape 
 * @param {Array} points 
 * @param {Boolean} isHorizontal 
 */
function getBottomShape(shape, points, isHorizontal) {

    // 通过点1，点2，再根据宽，高获取其余2个点，设置宽高方便动画
    return isHorizontal ? {
        x: points[0][0],
        y: points[0][1],
        x1: points[3][0],
        y1: points[3][1],
        width: shape.width,
        height: 0,
        sw: shape.width,
        sh: shape.height
    } : {
            x: points[1][0],
            y: points[1][1],
            x1: points[2][0],
            y1: points[2][1],
            width: 0,
            height: shape.height,
            sw: shape.width,
            sh: shape.height
        };
}

/**
 * 获取立方体正面图形参数
 * @param {Object} shape 
 * @param {Array} points 
 * @param {Boolean} isHorizontal 
 */
function getFrontShape(shape, points, isHorizontal) {

    // 通过点1，点2，再根据宽，高获取其余2个点，设置宽高方便动画
    return isHorizontal ? {
        x: points[0][0],
        y: points[0][1],
        x1: points[1][0],
        y1: points[1][1],
        width: 0,
        height: shape.height,
        sw: shape.width,
        sh: shape.height
    } : {
            x: points[0][0],
            y: points[0][1],
            x1: points[1][0],
            y1: points[1][1],
            width: shape.width,
            height: 0,
            sw: shape.width,
            sh: shape.height
        };
}

/**
 * 获取立方体侧面图形参数
 * @param {Object} shape 
 * @param {Array} points 
 * @param {Boolean} isHorizontal 
 */
function getFlankShape(shape, points, isHorizontal) {

    // 通过点1，点2，再根据宽，高获取其余2个点，设置宽高方便动画
    return isHorizontal ? {
        x: points[1][0],
        y: points[1][1],
        x1: points[2][0],
        y1: points[2][1],
        width: 0,
        height: shape.height,
        sw: shape.width,
        sh: shape.height
    } : {
            x: points[1][0],
            y: points[1][1],
            x1: points[2][0],
            y1: points[2][1],
            width: shape.width,
            height: 0,
            sw: shape.width,
            sh: shape.height
        };
}


/**
 * 获取立方体右侧面图形参数
 * @param {Object} shape 
 * @param {Array} points 
 * @param {Boolean} isHorizontal 
 */
function getRightFlankShape(shape, points, isHorizontal) {

    // 通过点1，点2，再根据宽，高获取其余2个点，设置宽高方便动画
    return isHorizontal ? {
        x: points[0][0],
        y: points[0][1],
        x1: points[3][0],
        y1: points[3][1],
        width: 0,
        height: shape.height,
        sw: shape.width,
        sh: shape.height
    } : {
            x: points[0][0],
            y: points[0][1],
            x1: points[3][0],
            y1: points[3][1],
            width: shape.width,
            height: 0,
            sw: shape.width,
            sh: shape.height
        };
}

/**
 * 颜色高亮
 * @param {String|Object} color 
 * @param {Number| -1~1} level 
 */
function leftColor(color, level) {
    if (typeof color == 'string') {
        return colorTool.lift(color, level)
    } else {
        // 设置的是渐变色,不改变
        return color;
    }
}

/**
 * 颜色变暗
 * @param {String|Object} color 
 * @param {Number| -1~1} level  
 */
function lerpColor(color, level) {
    if (typeof color == 'string') {
        return colorTool.lerp(level, [color, '#000'])
    } else {
        // 设置的是渐变色, 不改变
        return color;
    }
}

/**
 * 设置立方体图形样式
 * @param {Path} el 
 * @param {Array} data 
 * @param {Number} dataIndex 
 * @param {Object} itemModel 
 * @param {Object} layout 
 * @param {Object} seriesModel 
 * @param {Boolean} isHorizontal 
 */
function updateCubeStyle(el, data, dataIndex, itemModel, layout, seriesModel, isHorizontal) {
    var hoverStyle = itemModel.getModel('itemStyle.emphasis').getBarItemStyle();
    var color = data.getItemVisual(dataIndex, 'color');
    var opacity = data.getItemVisual(dataIndex, 'opacity');
    var itemStyleModel = itemModel.getModel('itemStyle.normal');
    var oldColor = itemStyleModel.getBarItemStyle();

    var rightFlank = el.childAt(0),
        bottom = el.childAt(1),
        top = el.childAt(2),
        leftFlank = el.childAt(3),
        front = el.childAt(4);

    front.setShape('r', itemStyleModel.get('barBorderRadius') || 0);
    top.useStyle(zrUtil.defaults(
        {
            fill: leftColor(color, -0.4),
            opacity: opacity
        },
        oldColor
    ));
    bottom.useStyle(zrUtil.defaults(
        {
            fill: leftColor(color, -0.4),
            opacity: opacity
        },
        oldColor
    ));
    rightFlank.useStyle(zrUtil.defaults(
        {
            fill: lerpColor(color, 0.2),
            opacity: opacity
        },
        oldColor
    ));

    leftFlank.useStyle(zrUtil.defaults(
        {
            fill: lerpColor(color, 0.2),
            opacity: opacity
        },
        oldColor
    ));
    front.useStyle(zrUtil.defaults( // 渲染正面
        {
            fill: color,
            opacity: opacity
        },
        oldColor
    ));
    // 设置标签
    var labelPositionOutside = isHorizontal
        ? (layout.height > 0 ? 'bottom' : 'top')
        : (layout.width > 0 ? 'left' : 'right');

    helper.setLabel(
        front.style, hoverStyle, itemModel, color,
        seriesModel, dataIndex, labelPositionOutside
    );

    // 设置鼠标移上样式
    helper.setHoverStyle(el, hoverStyle);
}

/**
 * 计算渐变色
 * @param {String} color 
 */
function gradColor(color, isHorizontal) {
    // 只支持字符串颜色值计算
    if (typeof color != 'string') {
        return color;
    }

    return new graphic.LinearGradient(
        0, 0, isHorizontal ? 1 : 0, isHorizontal ? 0 : 1,
        [
            { offset: 0, color: color },
            { offset: 0.43, color: colorTool.lerp(0.6, [color, '#000']) },
            { offset: 0.57, color: colorTool.lerp(0.6, [color, '#000']) },
            { offset: 1, color: color }
        ]
    );
}

/**
 * 获取轻微的颜色渐变
 * @param {String} color 
 * @param {Number| 0~1} level 
 * @param {Boolean} isHorizontal 
 */
function gradSlapColor(color, level, isHorizontal) {
    // 只支持字符串颜色值计算
    if (typeof color != 'string') {
        return color;
    }

    return new graphic.LinearGradient(
        0, 0, isHorizontal ? 0 : 1, isHorizontal ? 1 : 0,
        [
            { offset: 0, color: colorTool.lerp(level, [color, '#000']) },
            { offset: 1, color: color }
        ]
    );
}

/**
* 设置圆柱体图形样式
* @param {Path} el 
* @param {Array} data 
* @param {Number} dataIndex 
* @param {Object} itemModel 
* @param {Object} layout 
* @param {Object} seriesModel 
* @param {Boolean} isHorizontal 
*/
function updateCylinderStyle(el, data, dataIndex, itemModel, layout, seriesModel, isHorizontal) {

    var hoverStyle = itemModel.getModel('itemStyle.emphasis').getBarItemStyle();

    var color = data.getItemVisual(dataIndex, 'color');
    var opacity = data.getItemVisual(dataIndex, 'opacity') || 1;
    var itemStyleModel = itemModel.getModel('itemStyle.normal');
    var front = el.childAt(0),
        bottom = el.childAt(1),
        top = el.childAt(2),
        text = el.childAt(3);

    // front.setShape('r', itemStyleModel.get('barBorderRadius') || 0);
    top.useStyle(zrUtil.defaults(
        {
            fill: leftColor(color, -0.2),
            opacity: opacity
        },
        itemStyleModel.getBarItemStyle()
    ));
    bottom.useStyle(zrUtil.defaults(
        {
            fill: gradColor(color, isHorizontal),
            opacity: opacity
        },
        itemStyleModel.getBarItemStyle()
    ));

    // 正面的矩形需要时颜色渐变才能看出圆柱体效果
    front.useStyle(zrUtil.defaults(
        {
            fill: gradColor(color, isHorizontal),
            opacity: (opacity - 0.2) > 0 ? (opacity - 0.2) : 0.1
        },
        itemStyleModel.getBarItemStyle()
    ));

    text.useStyle(zrUtil.defaults(
        {
            fill: 'rgba(0,0,0,0)'
        }
    ));

    var labelPositionOutside = isHorizontal
        ? (layout.height > 0 ? 'bottom' : 'top')
        : (layout.width > 0 ? 'left' : 'right');

    helper.setLabel(
        text.style, hoverStyle, itemModel, color,
        seriesModel, dataIndex, labelPositionOutside
    );

    helper.setHoverStyle(el, hoverStyle);
}


/**
 * 获取圆柱体正面
 * @param {Object} shape 
 * @param {Boolean} isHorizontal 
 */
function getCylinderFront(shape, isHorizontal) {
    /*return isHorizontal ? {
        x: shape.x ,
        y: shape.y - shape.width / 8,
        width: shape.width,
        height: shape.height + shape.width / 8
    } : {
            x: shape.x + shape.height / 8,
            y: shape.y,
            width: shape.width - shape.height / 8,
            height: shape.height
        }*/
    return isHorizontal ? {
        x: shape.x,
        y: shape.y - shape.width / 8,
        width: shape.width,
        height: shape.height
    } : {
            x: shape.x + shape.height / 8,
            y: shape.y,
            width: shape.width,
            height: shape.height
        }
}

/**
 * 获取圆柱体正面
 * @param {Object} shape 
 * @param {Boolean} isHorizontal 
 */
function getCylinderTop(shape, isHorizontal) {
    /*return isHorizontal ? {
        cx: shape.x + shape.width / 2,
        cy: shape.y + shape.height,
        rx: shape.width / 2,
        ry: shape.width / 8,
        sw: shape.width,
        sh: shape.height
    } : {
            cx: shape.x + shape.width,
            cy: shape.y + shape.height / 2,
            rx: shape.height / 8,
            ry: shape.height / 2,
            sw: shape.width,
            sh: shape.height
        }*/
    return isHorizontal ? {
        cx: shape.x + shape.width / 2,
        cy: shape.y + shape.height - shape.width / 8,
        rx: shape.width / 2,
        ry: shape.width / 8,
        sw: shape.width,
        sh: shape.height
    } : {
            cx: shape.x + shape.width + shape.height / 8,
            cy: shape.y + shape.height / 2,
            rx: shape.height / 8,
            ry: shape.height / 2,
            sw: shape.width,
            sh: shape.height
        }
}

/**
 * 获取圆柱体底面
 * @param {Object} shape 
 * @param {Boolean} isHorizontal 
 */
function getCylinderBottom(shape, isHorizontal) {
    return isHorizontal ? {
        cx: shape.x + shape.width / 2,
        cy: shape.y - shape.width / 8,
        rx: shape.width / 2,
        ry: shape.width / 8,
        sw: shape.width,
        sh: shape.height
    } : {
            cx: shape.x + shape.height / 8,
            cy: shape.y + shape.height / 2,
            rx: shape.height / 8,
            ry: shape.height / 2,
            sw: shape.width,
            sh: shape.height
        }
}

function createCylinder(data, dataIndex, itemModel, layout, isHorizontal, animationModel, isUpdate) {
    var g = new graphic.Group();
    g.isCube = false; // 设置是否立方体
    var shape = zrUtil.extend({}, layout);

    // 绘制正面
    var front = new graphic.Rect({
        location: 'front',
        shape: getCylinderFront(shape, isHorizontal),
        isHorizontal: isHorizontal
    });

    // 绘制文字图形容器
    var text = new graphic.Rect({
        location: 'text',
        shape: getCylinderFront(shape, isHorizontal),
        isHorizontal: isHorizontal
    });

    // 绘制底面
    var bottom = new graph.Ellipse({
        location: 'bottom',
        shape: getCylinderBottom(shape, isHorizontal)
    });

    // 绘制顶面
    var top = new graph.Ellipse({
        location: 'top',
        shape: getCylinderTop(shape, isHorizontal)
    });

    g.add(front);
    g.add(bottom);
    g.add(top);
    g.add(text);

    // Animation
    if (animationModel) {
        // 正面动画
        var frontShape = front.shape;
        var animateProperty = isHorizontal ? 'height' : 'width';
        var animateTarget = {};
        animateTarget[animateProperty] = frontShape[animateProperty];
        frontShape[animateProperty] = 0;
        graphic[isUpdate ? 'updateProps' : 'initProps'](front, {
            shape: animateTarget
        }, animationModel, dataIndex);
        // 顶面动画
        var topShape = top.shape;
        var animateProperty = isHorizontal ? 'cy' : 'cx';
        var animateTarget = {};
        animateTarget[animateProperty] = topShape[animateProperty];
        topShape[animateProperty] = bottom.shape[animateProperty];

        graphic[isUpdate ? 'updateProps' : 'initProps'](top, {
            shape: animateTarget
        }, animationModel, dataIndex);
    }

    return g;
}

/**
 * 删除图形
 * @param {Number} dataIndex 
 * @param {Object} animationModel 
 * @param {Group} el 
 */
function removeRect(dataIndex, animationModel, el) {

    // 运动的时候不显示文字
    el.eachChild(function (childEl) {
        childEl.style.text = '';
    });

    if (animationModel) {
        var isCube = el.isCube;
        isCube ? removeCube(dataIndex, animationModel, el) :
            removeCylinder(dataIndex, animationModel, el);

    } else {
        graphic.updateProps(el, {
            shape: {}
        }, animationModel, dataIndex, function () {
            el.parent && el.parent.remove(el);
        });
    }
}

/**
* 删除立方体图形
* @param {Number} dataIndex 
* @param {Object} animationModel 
* @param {Group} el 
* @param {Boolean} isHorizontal
*/
function removeCube(dataIndex, animationModel, el) {
    var rightFlank = el.childAt(0),
        bottom = el.childAt(1),
        top = el.childAt(2),
        front = el.childAt(3),
        leftFlank = el.childAt(4);

    var isHorizontal = front.isHorizontal;
    var bshape = bottom.shape;

    // 正面动画
    graphic.updateProps(front, {
        shape: isHorizontal ? {
            height: 0
        } : {
                width: 0
            }
    }, animationModel, dataIndex, function () {
        el.parent && el.parent.remove(el);
    });

    // 右侧面动画
    graphic.updateProps(rightFlank, {
        shape: isHorizontal ? {
            height: 0
        } : {
                width: 0
            }
    }, animationModel, dataIndex);

    // 左侧面动画
    graphic.updateProps(leftFlank, {
        shape: isHorizontal ? {
            height: 0
        } : {
                width: 0
            }
    }, animationModel, dataIndex);

    // 顶面动画
    graphic.updateProps(top, {
        shape: bshape
    }, animationModel, dataIndex);
}

/**
 * 删除圆柱体图形
 * @param {Number} dataIndex 
 * @param {Object} animationModel 
 * @param {Group} el 
 * @param {Boolean} isHorizontal
 */
function removeCylinder(dataIndex, animationModel, el, isHorizontal) {

    // 注位置要与存入一致
    var front = el.childAt(0),
        bottom = el.childAt(1),
        top = el.childAt(2);

    var isHorizontal = front.isHorizontal;
    var bShape = bottom.shape;

    graphic.updateProps(front, {
        shape: isHorizontal ? {
            height: 0
        } : {
                width: 0
            }
    }, animationModel, dataIndex, function () {
        el.parent && el.parent.remove(el);
    });

    graphic.updateProps(top, {
        shape: bShape
    }, animationModel, dataIndex, function () {

    });
}

/**
 * 获取柱状图柱子布局大小
 * @param {} data 
 * @param {Number} dataIndex 
 * @param {Model} itemModel 
 */
function getRectItemLayout(data, dataIndex, itemModel) {
    var layout = data.getItemLayout(dataIndex);
    var fixedLineWidth = getLineWidth(itemModel, layout);

    // fix layout with lineWidth
    var signX = layout.width > 0 ? 1 : -1;
    var signY = layout.height > 0 ? 1 : -1;

    return {
        x: layout.x + signX * fixedLineWidth / 2,
        y: layout.y + signY * fixedLineWidth / 2,
        width: layout.width - signX * fixedLineWidth,
        height: layout.height - signY * fixedLineWidth,
        length: itemModel.get('barLength')
    };
}

// In case width or height are too small.
function getLineWidth(itemModel, rawLayout) {
    var lineWidth = itemModel.get(BAR_BORDER_WIDTH_QUERY) || 0;
    return Math.min(lineWidth, Math.abs(rawLayout.width), Math.abs(rawLayout.height));
}

module.exports = BarView;