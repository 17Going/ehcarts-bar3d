var echarts = _echarts3;//require('echarts/lib/echarts');
var zrUtil = require('zrender/lib/core/util');
var graphic = echarts.graphic;

var helper = {};

helper.setLabel = function (
    normalStyle, hoverStyle, itemModel, color, seriesModel, dataIndex, labelPositionOutside
) {
    var labelModel = itemModel.getModel('label.normal');
    var hoverLabelModel = itemModel.getModel('label.emphasis');

    if (labelModel.get('show')) {
        setLabel(
            normalStyle, labelModel, color,
            zrUtil.retrieve(
                seriesModel.getFormattedLabel(dataIndex, 'normal'),
                seriesModel.getRawValue(dataIndex)
            ),
            labelPositionOutside
        );
    }
    else {
        normalStyle.text = '';
    }

    if (hoverLabelModel.get('show')) {
        setLabel(
            hoverStyle, hoverLabelModel, color,
            zrUtil.retrieve(
                seriesModel.getFormattedLabel(dataIndex, 'emphasis'),
                seriesModel.getRawValue(dataIndex)
            ),
            labelPositionOutside
        );
    }
    else {
        hoverStyle.text = '';
    }
};

function setLabel(style, model, color, labelText, labelPositionOutside) {
    graphic.setText(style, model, color);
    style.text = labelText;
    if (style.textPosition === 'outside') {
        style.textPosition = labelPositionOutside;
    }
}

helper.setHoverStyle = function (el, hoverStyle) {
    var temp = zrUtil.clone(hoverStyle);
    // 监听group事件
    graphic.setHoverStyle(el, {});
    var isCube = el.isCube;
    el.eachChild(function (child) {
        if (child.location != 'front' && child.location != 'text') {
            graphic.setHoverStyle(child, zrUtil.extend(temp, { text: '' }));
        } else if (child.location == 'front' && !isCube) {
            graphic.setHoverStyle(child, zrUtil.extend(temp, { text: '' }));
        } else if (child.location == 'front' && isCube) {
            graphic.setHoverStyle(child, hoverStyle);
        } else if (child.location == 'text') {
            graphic.setHoverStyle(child, child.style);
        }
        child.off('mouseover').off('mouseout').off('emphasis').off('normal');
    });
}

module.exports = helper;