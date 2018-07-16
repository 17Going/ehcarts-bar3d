var echarts = require('echarts/lib/echarts');

var zrUtil = echarts.util;

var _poly = require("./poly");

var Polyline = _poly.Polyline;
var Polygon = _poly.Polygon;



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
    // var lineStyleModel = seriesModel.getModel('lineStyle.normal');
    //获取点数据
    var points = data.mapArray(data.getItemLayout, true);
    // 获取坐标轴上的坐标点
    var stackedOnPoints = getStackedOnPoints(coordSys, data);
    var hasAnimation = seriesModel.get('animation');

    // 数据变化时怎么操作
    data.diff(oldData)
      .add(function(dataIndex){
          var el = createArea(points, stackedOnPoints, isHorizontal);
          group.add(el);

          updateStyle(el, data, dataIndex, seriesModel)
      })
      .update(function(newIndex, oldIndex){

      })
      .remove(function (dataIndex) {

      })
      .execute();

  },

  dispose: function () { },

  remove: function (ecModel) {

  }
});

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


function createArea(points, stackedOnPoints, isHorizontal){
    var points1 = points.map(function(item){
      return [item[0] + 10, item[1] -10]
    });
    var top = new Polygon({
      shape: {
        points: points,
        stackedOnPoints: points1,
      }
    });

    return top;
}

function updateStyle(el, data, dataIndex, itemModel){
  var areaStyleModel = itemModel.getModel('areaStyle.normal');

  el.useStyle(zrUtil.defaults( // Use color in lineStyle first
    areaStyleModel.getLineStyle(), {
      fill: 'red',
      stroke: 'none'
    }));
}

module.exports = _default;