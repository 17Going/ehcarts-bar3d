var echarts = _echarts3;//require('echarts/lib/echarts');

/**
 * 绘制4边形
 */
var Quadrangle = echarts.graphic.extendShape({
    type: 'quadrangle',
    shape: {
        points: [],
        width: 0,
        height: 0
    },
    buildPath: function (ctx, shape) {
        var points = [[shape.x, shape.y],[shape.x1, shape.y1]];
        var w = shape.width, h = shape.height;

        // 根据width/height获取另外两个点便于动画
        points[2] = [points[1][0] + w, points[1][1] + h];
        points[3] = [points[0][0] + w, points[0][1] + h];

        ctx.moveTo.apply(ctx, points[0]);
        ctx.lineTo.apply(ctx, points[1]);
        ctx.lineTo.apply(ctx, points[2]);
        ctx.lineTo.apply(ctx, points[3]);
        ctx.closePath();
    }
});

var Ellipse = echarts.graphic.extendShape({
    type: 'ellipse',

    shape: {
        cx: 0, cy: 0,
        rx: 0, ry: 0
    },

    buildPath: function (ctx, shape) {
        var k = 0.5522848;
        var x = shape.cx;
        var y = shape.cy;
        var a = shape.rx;
        var b = shape.ry;
        var ox = a * k; // 水平控制点偏移量
        var oy = b * k; // 垂直控制点偏移量
        // 从椭圆的左端点开始顺时针绘制四条三次贝塞尔曲线
        ctx.moveTo(x - a, y);
        ctx.bezierCurveTo(x - a, y - oy, x - ox, y - b, x, y - b);
        ctx.bezierCurveTo(x + ox, y - b, x + a, y - oy, x + a, y);
        ctx.bezierCurveTo(x + a, y + oy, x + ox, y + b, x, y + b);
        ctx.bezierCurveTo(x - ox, y + b, x - a, y + oy, x - a, y);
        ctx.closePath();
    }
});

module.exports = {
    Quadrangle: Quadrangle,
    Ellipse: Ellipse
}