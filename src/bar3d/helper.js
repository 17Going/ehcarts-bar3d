var echarts = _echarts3;
var helper = {};
var graphic = echarts.graphic;
var colorUtil = echarts.color;

function setLabel(normalStyle, hoverStyle, itemModel, color, seriesModel, dataIndex, labelPositionOutside) {
    var labelModel = itemModel.getModel('label.normal');
    var hoverLabelModel = itemModel.getModel('label.emphasis');
    graphic.setLabelStyle(normalStyle, hoverStyle, labelModel, hoverLabelModel, {
        labelFetcher: seriesModel,
        labelDataIndex: dataIndex,
        defaultText: seriesModel.getRawValue(dataIndex),
        isRectText: true,
        autoColor: color
    });
    fixPosition(normalStyle);
    fixPosition(hoverStyle);
}

function fixPosition(style, labelPositionOutside) {
    if (style.textPosition === 'outside') {
        style.textPosition = labelPositionOutside;
    }
}

helper.setLabel = setLabel;

function liftColor(color) {
    return typeof color === 'string' ? colorUtil.lift(color, 0) : color;
}


helper.setHoverStyle = function (el, hoverStyle, topColor) {
    var temp = echarts.util.clone(hoverStyle);
    temp.text = '';
    // 监听group事件
    graphic.setHoverStyle(el, {});
    el.eachChild(function (child) {
        if(child.name != 'text'){
            graphic.setHoverStyle(child, echarts.util.defaults(temp, { fill: liftColor(topColor) }));
        } else {
            // 圆柱体的呈现标签的元素不显示，设置颜色为透明
            graphic.setHoverStyle(child, {text: '', fill: 'rgba(0,0,0,0)'});
        }
        child.off('mouseover').off('mouseout').off('emphasis').off('normal');
    });
}

module.exports = helper;