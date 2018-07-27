var zrUtil = require("zrender/lib/core/util");

var Cartesian = require("echarts/lib/coord/cartesian/Cartesian");

function Cartesian3D(name) {
  Cartesian.call(this, name);
}

Cartesian3D.prototype = {
  constructor: Cartesian3D,
  type: 'cartesian3d',

  /**
   * @type {Array.<string>}
   * @readOnly
   */
  dimensions: ['x3d', 'y3d'],

  /**
   * Base axis will be used on stacking.
   *
   * @return {module:echarts/coord/cartesian/Axis2D}
   */
  getBaseAxis: function () {
    return this.getAxesByScale('ordinal')[0] || this.getAxesByScale('time')[0] || this.getAxis('x3d');
  },

  /**
   * If contain point
   * @param {Array.<number>} point
   * @return {boolean}
   */
  containPoint: function (point) {
    var axisX = this.getAxis('x3d');
    var axisY = this.getAxis('y3d');
    return axisX.contain(axisX.toLocalCoord(point[0])) && axisY.contain(axisY.toLocalCoord(point[1]));
  },

  /**
   * If contain data
   * @param {Array.<number>} data
   * @return {boolean}
   */
  containData: function (data) {
    return this.getAxis('x3d').containData(data[0]) && this.getAxis('y3d').containData(data[1]);
  },

  /**
   * @param {Array.<number>} data
   * @param {boolean} [clamp=false]
   * @return {Array.<number>}
   */
  dataToPoint: function (data, clamp) {
    var xAxis = this.getAxis('x3d');
    var yAxis = this.getAxis('y3d');
    return [xAxis.toGlobalCoord(xAxis.dataToCoord(data[0], clamp)), yAxis.toGlobalCoord(yAxis.dataToCoord(data[1], clamp))];
  },

  /**
   * @param {Array.<number>} point
   * @param {boolean} [clamp=false]
   * @return {Array.<number>}
   */
  pointToData: function (point, clamp) {
    var xAxis = this.getAxis('x3d');
    var yAxis = this.getAxis('y3d');
    return [xAxis.coordToData(xAxis.toLocalCoord(point[0]), clamp), yAxis.coordToData(yAxis.toLocalCoord(point[1]), clamp)];
  },

  /**
   * Get other axis
   * @param {module:echarts/coord/cartesian/Axis2D} axis
   */
  getOtherAxis: function (axis) {
    return this.getAxis(axis.dim === 'x3d' ? 'y3d' : 'x3d');
  }
};
zrUtil.inherits(Cartesian3D, Cartesian);
var _default = Cartesian3D;
module.exports = _default;