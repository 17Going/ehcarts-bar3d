var echarts = _echarts3;//require('echarts/lib/echarts');
var helper = {};
var graphic = echarts.graphic;

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


helper.setHoverStyle = function (el, hoverStyle) {
    var temp = echarts.util.clone(hoverStyle);
    // 监听group事件
    graphic.setHoverStyle(el, {});
    var isCube = el.isCube;
    el.eachChild(function (child) {
        if (child.location != 'front' && child.location != 'text') {
            graphic.setHoverStyle(child, echarts.util.extend(temp, { text: '' }));
        } else if (child.location == 'front' && !isCube) {
            graphic.setHoverStyle(child, echarts.util.extend(temp, { text: '' }));
        } else if (child.location == 'front' && isCube) {
            graphic.setHoverStyle(child, hoverStyle);
        } else if (child.location == 'text') {
            graphic.setHoverStyle(child, child.style);
        }
        child.off('mouseover').off('mouseout').off('emphasis').off('normal');
    });
}

module.exports = helper;