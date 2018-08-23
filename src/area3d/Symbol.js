var echarts = _echarts3;
var zrUtil = echarts.util;

var _symbol = require("./symbolUtil");

var createSymbol = _symbol.createSymbol;

var graphic = echarts.graphic;

var parsePercent = echarts.number.parsePercent;

var _labelHelper = require("echarts/lib/chart/helper/labelHelper");

var findLabelValueDim = _labelHelper.findLabelValueDim;

/**
 * @module echarts/chart/helper/Symbol
 */
function getSymbolSize(data, idx) {
    var symbolSize = data.getItemVisual(idx, 'symbolSize');
    return symbolSize instanceof Array ? symbolSize.slice() : [+symbolSize, +symbolSize];
}

function getScale(symbolSize) {
    return [symbolSize[0] / 2, symbolSize[1] / 2];
}
/**
 * @constructor
 * @alias {module:echarts/chart/helper/Symbol}
 * @param {module:echarts/data/List} data
 * @param {number} idx
 * @extends {module:zrender/graphic/Group}
 */


function SymbolClz(data, idx, seriesScope) {
    graphic.Group.call(this);
    this.updateData(data, idx, seriesScope);
}

var symbolProto = SymbolClz.prototype;

function driftSymbol(dx, dy) {
    this.parent.drift(dx, dy);
}

symbolProto._createSymbol = function (symbolType, data, idx, symbolSize) {
    // Remove paths created before
    this.removeAll();
    var seriesModel = data.hostModel;
    var color = seriesModel.get('symbolLineColor') || data.getItemVisual(idx, 'color'); // var symbolPath = createSymbol(
    //     symbolType, -0.5, -0.5, 1, 1, color
    // );
    // If width/height are set too small (e.g., set to 1) on ios10
    // and macOS Sierra, a circle stroke become a rect, no matter what
    // the scale is set. So we set width/height as 2. See #4150.

    var symbolPath = createSymbol(symbolType, -1, -1, 2, 2, color);
    symbolPath.attr({
        z2: 100,
        culling: true,
        scale: getScale(symbolSize)
    }); // Rewrite drift method

    symbolPath.drift = driftSymbol;
    this._symbolType = symbolType;
    this.add(symbolPath);
};

/**
 * Stop animation
 * @param {boolean} toLastFrame
 */

symbolProto.stopSymbolAnimation = function (toLastFrame) {
    this.childAt(0).stopAnimation(toLastFrame);
};
/**
 * FIXME:
 * Caution: This method breaks the encapsulation of this module,
 * but it indeed brings convenience. So do not use the method
 * unless you detailedly know all the implements of `Symbol`,
 * especially animation.
 *
 * Get symbol path element.
 */


symbolProto.getSymbolPath = function () {
    return this.childAt(0);
};
/**
 * Get scale(aka, current symbol size).
 * Including the change caused by animation
 */


symbolProto.getScale = function () {
    return this.childAt(0).scale;
};
/**
 * Highlight symbol
 */


symbolProto.highlight = function () {
    this.childAt(0).trigger('emphasis');
};
/**
 * Downplay symbol
 */


symbolProto.downplay = function () {
    this.childAt(0).trigger('normal');
};
/**
 * @param {number} zlevel
 * @param {number} z
 */


symbolProto.setZ = function (zlevel, z) {
    var symbolPath = this.childAt(0);
    symbolPath.zlevel = zlevel;
    symbolPath.z = z;
};

symbolProto.setDraggable = function (draggable) {
    var symbolPath = this.childAt(0);
    symbolPath.draggable = draggable;
    symbolPath.cursor = draggable ? 'move' : 'pointer';
};
/**
 * Update symbol properties
 * @param {module:echarts/data/List} data
 * @param {number} idx
 * @param {Object} [seriesScope]
 * @param {Object} [seriesScope.itemStyle]
 * @param {Object} [seriesScope.hoverItemStyle]
 * @param {Object} [seriesScope.symbolRotate]
 * @param {Object} [seriesScope.symbolOffset]
 * @param {module:echarts/model/Model} [seriesScope.labelModel]
 * @param {module:echarts/model/Model} [seriesScope.hoverLabelModel]
 * @param {boolean} [seriesScope.hoverAnimation]
 * @param {Object} [seriesScope.cursorStyle]
 * @param {module:echarts/model/Model} [seriesScope.itemModel]
 * @param {string} [seriesScope.symbolInnerColor]
 * @param {Object} [seriesScope.fadeIn=false]
 */


symbolProto.updateData = function (data, idx, seriesScope) {
    this.silent = false;
    var symbolType = data.getItemVisual(idx, 'symbol') || 'circle';
    var seriesModel = data.hostModel;
    var symbolSize = getSymbolSize(data, idx);
    var isInit = symbolType !== this._symbolType;

    if (isInit) {
        this._createSymbol(symbolType, data, idx, symbolSize);
    } else {
        var symbolPath = this.childAt(0);
        symbolPath.silent = false;
        graphic.updateProps(symbolPath, {
            scale: getScale(symbolSize)
        }, seriesModel, idx);
    }

    // 设置连线
    this.link(data, idx, symbolType, symbolSize, seriesScope);

    // 进行事件监听
    this._updateCommon(data, idx, symbolSize, seriesScope);

    if (isInit) {
        var symbolPath = this.childAt(0);
        var fadeIn = seriesScope && seriesScope.fadeIn;
        var target = {
            scale: symbolPath.scale.slice()
        };
        fadeIn && (target.style = {
            opacity: symbolPath.style.opacity
        });
        symbolPath.scale = [0, 0];
        fadeIn && (symbolPath.style.opacity = 0);
        graphic.initProps(symbolPath, target, seriesModel, idx);
    }

    this._seriesModel = seriesModel;
}; // Update common properties



var normalStyleAccessPath = ['itemStyle', 'normal'];
var emphasisStyleAccessPath = ['itemStyle', 'emphasis'];
var normalLabelAccessPath = ['label', 'normal'];
var emphasisLabelAccessPath = ['label', 'emphasis'];


/**
 * 绘制连线
 */
symbolProto.link = function (data, idx, symbolType, symbolSize, seriesScope) {
    var symbolPath = this.childAt(0);
    var isCreate = !this.childAt(1);
    var seriesModel = data.hostModel;
    var shape = symbolPath.oldShape;
    var symbolOffset = seriesScope && seriesScope.symbolOffset;
    var symbolLineType = seriesScope && seriesScope.symbolLineType;
    var symbolLineWidth = seriesScope && seriesScope.symbolLineWidth;
    var symbolLineColor = seriesScope && seriesScope.symbolLineColor;


    if (!seriesScope || data.hasItemOption) {
        var itemModel = seriesScope && seriesScope.itemModel ? seriesScope.itemModel : data.getItemModel(idx); // Color must be excluded.
        symbolOffset = itemModel.getShallow('symbolOffset');
    }


    // 未设置偏移量或者设置的偏移较小不绘制连线
    if (!symbolOffset || Math.max(Math.abs(symbolOffset[0]), Math.abs(symbolOffset[1])) < symbolSize[0]) {
        return;
    }

    var color = symbolLineColor || data.getItemVisual(idx, 'color');
    var startX = shape.x;
    var startY = shape.y;

    var x = parsePercent(symbolOffset[0], symbolSize[0]);
    var y = parsePercent(symbolOffset[1], symbolSize[1]);

    if (symbolType.indexOf('empty') === 0 || symbolType == 'line') {
        y += (symbolSize[1] / 2 + symbolLineWidth/2);
    }

    // 做个限制，y不能大于0,防止反向绘制
    y = Math.min(y, 0);

    var dotSize = Math.max(symbolLineWidth, 1);
    var dashSize = symbolLineWidth * 2;
    var lineDash = symbolLineType === 'solid' || symbolLineType == null ? null : symbolLineType === 'dashed' ? [dashSize, dashSize] : [dotSize, dotSize];

    // 判断连线是否存在，已存在不需要重新创建
    var line = isCreate ? new graphic.Line({
        shape: {
            x1: startX + x,
            y1: startY + y,
            x2: startX + x,
            y2: startY + y
        },
        z2: 10001
    }) : this.childAt(1);

    // 设置样式
    line.useStyle(
        {
            fill: 'none',
            lineDash: lineDash,
            opacity: isCreate ? 0 : 1,
            lineWidth: symbolLineWidth,
            stroke: color
        }
    );

    if(isCreate){
        graphic.initProps(line, {
            shape: {
                x1: startX + x,
                y1: startY,
                x2: startX + x,
                y2: startY + y
            },
            style: {
                opacity: 1
            }
        }, seriesModel, idx)
    } else {
        graphic.updateProps(line, {
            shape: {
                x1: startX + x,
                y1: startY,
                x2: startX + x,
                y2: startY + y
            }
        }, seriesModel, idx)
    }
    this.add(line);
    line.attr('position', [1.5, 0]);
}

/**
 * @param {module:echarts/data/List} data
 * @param {number} idx
 * @param {Array.<number>} symbolSize
 * @param {Object} [seriesScope]
 */
symbolProto._updateCommon = function (data, idx, symbolSize, seriesScope) {
    var symbolPath = this.childAt(0);
    var linePath = this.childAt(1);
    // 记录连线启动y轴位置
    var _y2 = linePath ? linePath.shape.y2 : 0;
    var seriesModel = data.hostModel;

    if (symbolPath.type !== 'image') {
        symbolPath.useStyle({
            strokeNoScale: true
        });
    }

    var itemStyle = seriesScope && seriesScope.itemStyle;
    var hoverItemStyle = seriesScope && seriesScope.hoverItemStyle;
    var symbolRotate = seriesScope && seriesScope.symbolRotate;
    var symbolOffset = seriesScope && seriesScope.symbolOffset;
    var symbolLineWidth = seriesScope && seriesScope.symbolLineWidth;
    var labelModel = seriesScope && seriesScope.labelModel;
    var hoverLabelModel = seriesScope && seriesScope.hoverLabelModel;
    var hoverAnimation = seriesScope && seriesScope.hoverAnimation;
    var cursorStyle = seriesScope && seriesScope.cursorStyle;
    var symbolLineColor = seriesScope && seriesScope.symbolLineColor;

    var color = symbolLineColor || data.getItemVisual(idx, 'color'); // Reset style

    if (!seriesScope || data.hasItemOption) {
        var itemModel = seriesScope && seriesScope.itemModel ? seriesScope.itemModel : data.getItemModel(idx); // Color must be excluded.
        // Because symbol provide setColor individually to set fill and stroke

        itemStyle = itemModel.getModel(normalStyleAccessPath).getItemStyle(['color']);
        hoverItemStyle = itemModel.getModel(emphasisStyleAccessPath).getItemStyle();
        symbolRotate = itemModel.getShallow('symbolRotate');
        symbolOffset = itemModel.getShallow('symbolOffset');
        labelModel = itemModel.getModel(normalLabelAccessPath);
        hoverLabelModel = itemModel.getModel(emphasisLabelAccessPath);
        hoverAnimation = itemModel.getShallow('hoverAnimation');
        cursorStyle = itemModel.getShallow('cursor');
    } else {
        hoverItemStyle = zrUtil.extend({}, hoverItemStyle);
    }

    var elStyle = symbolPath.style;
    symbolPath.attr('rotation', (symbolRotate || 0) * Math.PI / 180 || 0);

    if (symbolOffset) {
        symbolPath.attr('position', [parsePercent(symbolOffset[0], symbolSize[0]), parsePercent(symbolOffset[1], symbolSize[1])]);
    }

    cursorStyle && symbolPath.attr('cursor', cursorStyle); // PENDING setColor before setStyle!!!

    symbolPath.setColor(color, seriesScope && seriesScope.symbolInnerColor);
    // 设置连线粗细和拐点粗细进行关联

    symbolLineWidth ? itemStyle.lineWidth = symbolLineWidth : '';
    symbolPath.setStyle(itemStyle);
    var opacity = data.getItemVisual(idx, 'opacity');

    if (opacity != null) {
        elStyle.opacity = opacity;
    }

    var useNameLabel = seriesScope && seriesScope.useNameLabel;
    var valueDim = !useNameLabel && findLabelValueDim(data);

    if (useNameLabel || valueDim != null) {
        graphic.setLabelStyle(elStyle, hoverItemStyle, labelModel, hoverLabelModel, {
            labelFetcher: seriesModel,
            labelDataIndex: idx,
            defaultText: useNameLabel ? data.getName(idx) : data.get(valueDim, idx),
            isRectText: true,
            autoColor: color
        });
    }

    symbolPath.off('mouseover').off('mouseout').off('emphasis').off('normal');
    symbolPath.hoverStyle = hoverItemStyle; // FIXME
    // Do not use symbol.trigger('emphasis'), but use symbol.highlight() instead.

    graphic.setHoverStyle(symbolPath);
    var scale = getScale(symbolSize);

    if (hoverAnimation && seriesModel.isAnimationEnabled()) {
        var onEmphasis = function () {
            var ratio = scale[1] / scale[0];
            this.animateTo({
                scale: [Math.max(scale[0] * 1.1, scale[0] + 3), Math.max(scale[1] * 1.1, scale[1] + 3 * ratio)]
            }, 400, 'elasticOut');

            // 鼠标移上时，拐点会变大， 但是线的位置未变，导致出现线超出拐点边框,连线变短
            if (!linePath) { // 没有连线返回
                return;
            }
            var shape = linePath.shape;
            if(shape.y1 == shape.y2){// 边框设置过大会反向绘制去掉
                return ;
            }
            var y2 = _y2 + (symbolSize[1] * ratio) / 2;
            linePath.setShape(zrUtil.defaults({
                y2: y2
            }, shape));
        };

        var onNormal = function () {
            this.animateTo({
                scale: scale
            }, 400, 'elasticOut');

            // 鼠标移上时，拐点会变大， 但是线的位置未变，导致出现线超出拐点边框,连线变短
            if (!linePath) { // 没有连线返回
                return;
            }
            var shape = linePath.shape;
            if(shape.y1 == shape.y2){// 边框设置过大会反向绘制去掉
                return ;
            }
            linePath.setShape(zrUtil.defaults({
                y2: _y2
            }, shape));
        };

        symbolPath.on('mouseover', onEmphasis).on('mouseout', onNormal).on('emphasis', onEmphasis).on('normal', onNormal);
    }
};
/**
 * @param {Function} cb
 * @param {Object} [opt]
 * @param {Object} [opt.keepLabel=true]
 */


symbolProto.fadeOut = function (cb, opt) {
    var symbolPath = this.childAt(0); // Avoid mistaken hover when fading out

    this.silent = symbolPath.silent = true; // Not show text when animating

    !(opt && opt.keepLabel) && (symbolPath.style.text = null);
    graphic.updateProps(symbolPath, {
        style: {
            opacity: 0
        },
        scale: [0, 0]
    }, this._seriesModel, this.dataIndex, cb);
};

zrUtil.inherits(SymbolClz, graphic.Group);
var _default = SymbolClz;
module.exports = _default;