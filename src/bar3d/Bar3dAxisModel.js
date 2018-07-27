var echarts = require('echarts/lib/echarts');
var zrUtil = require("zrender/lib/core/util");
var axisModelCreator = require("echarts/lib/coord/axisModelCreator");
var axisModelCommonMixin = require("echarts/lib/coord/axisModelCommonMixin");


var AxisModel = echarts.extendComponentModel({
  type: 'cartesian3dAxis',

  /**
   * @type {module:echarts/coord/cartesian/Axis2D}
   */
  axis: null,

  /**
   * @override
   */
  init: function () {
    AxisModel.superApply(this, 'init', arguments);
    this.resetRange();
  },

  /**
   * @override
   */
  mergeOption: function () {
    AxisModel.superApply(this, 'mergeOption', arguments);
    this.resetRange();
  },

  /**
   * @override
   */
  restoreData: function () {
    AxisModel.superApply(this, 'restoreData', arguments);
    this.resetRange();
  },

  /**
   * @override
   * @return {module:echarts/model/Component}
   */
  getCoordSysModel: function () {
    return this.ecModel.queryComponents({
      mainType: 'grid3d',
      index: this.option.gridIndex,
      id: this.option.gridId
    })[0];
  }
});

function getAxisType(axisDim, option) {
  // Default axis with data is category axis
  return option.type || (option.data ? 'category' : 'value');
}

zrUtil.merge(AxisModel.prototype, axisModelCommonMixin);
var extraOption = {
  offset: 0,
  splitLine: {
    show: true,
    offset: 10, // 分割线默认偏移距离
    lineStyle: {
      color: '#253046'
    }
  }
};


axisModelCreator('x3d', AxisModel, getAxisType, extraOption);
axisModelCreator('y3d', AxisModel, getAxisType, extraOption);
var _default = AxisModel;

module.exports = _default;