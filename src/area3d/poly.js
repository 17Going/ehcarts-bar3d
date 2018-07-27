var echarts = require('echarts/lib/echarts');
var Path = require("zrender/lib/graphic/Path");
var graphic = echarts.graphic;

var vec2 = echarts.vector;
var vec2Min = vec2.min;
var vec2Max = vec2.max;

var scaleAndAdd = vec2.scaleAndAdd;
var v2Copy = vec2.copy;

// Temporary variable
var v = [];
var cp0 = [];
var cp1 = [];

function isPointNull(p) {
    return isNaN(p[0]) || isNaN(p[1]);
}

/**
 * 绘制面积
 * @param {*} ctx 
 * @param {*} points 
 * @param {*} start 
 * @param {*} segLen 
 * @param {*} allLen 
 * @param {*} dir 
 * @param {*} smoothMin 
 * @param {*} smoothMax 
 * @param {*} smooth 
 */
function drawNonMono(
    ctx, points, start, segLen, allLen,
    dir, smoothMin, smoothMax, smooth
) {
    var prevIdx = 0;
    var idx = start;
    for (var k = 0; k < segLen; k++) {
        var p = points[idx];
        if (idx >= allLen || idx < 0) {
            break;
        }

        if (idx === start) {
            ctx[dir > 0 ? 'moveTo' : 'lineTo'](p[0], p[1]);
            v2Copy(cp0, p);
        }
        else {
            if (smooth > 0) {
                var nextIdx = idx + dir;
                var nextP = points[nextIdx];
                var ratioNextSeg = 0.5;
                var prevP = points[prevIdx];
                var nextP = points[nextIdx];
                // Last point
                if (!nextP || isPointNull(nextP)) {
                    v2Copy(cp1, p);
                }
                else {
                    if (isPointNull(nextP)) {
                        nextP = p;
                    }

                    vec2.sub(v, nextP, prevP);

                    var lenPrevSeg;
                    var lenNextSeg;
                    lenPrevSeg = vec2.dist(p, prevP);
                    lenNextSeg = vec2.dist(p, nextP);
                    ratioNextSeg = lenNextSeg / (lenNextSeg + lenPrevSeg);

                    scaleAndAdd(cp1, p, v, -smooth * (1 - ratioNextSeg));
                }
                vec2Min(cp0, cp0, smoothMax);
                vec2Max(cp0, cp0, smoothMin);
                vec2Min(cp1, cp1, smoothMax);
                vec2Max(cp1, cp1, smoothMin);

                ctx.bezierCurveTo(
                    cp0[0], cp0[1],
                    cp1[0], cp1[1],
                    p[0], p[1]
                );

                scaleAndAdd(cp0, p, v, smooth * ratioNextSeg);
            }
            else {
                ctx.lineTo(p[0], p[1]);
            }
        }

        prevIdx = idx;
        idx += dir;
    }
    return k;
}

/**
 * 判断p2是在p1和p3绘制之外还是之内
 * @param {Array} p1 
 * @param {Array} p2 
 * @param {Array} p3 
 */
function isOver(p1, p2, p3) {
    var x1 = p2[0] - p1[0];
    var y1 = p2[1] - p1[1];

    var x2 = p3[0] - p1[0];
    var y2 = p3[1] - p1[1];

    return Math.atan(y1 / x1) > Math.atan(y2 / x2)
}

/**
 * 绘制面不包括背面
 * @param {*} ctx 
 * @param {*} points 
 * @param {*} start 
 * @param {*} segLen 
 * @param {*} allLen 
 * @param {*} dir 
 * @param {*} smoothMin 
 * @param {*} smoothMax 
 * @param {*} smooth 
 * @param {*} followOver 
 */
function drawOverMono(
    ctx, points, stackedOnPoints, start, segLen, allLen,
    dir, smoothMin, smoothMax, smooth
) {
    var prevIdx = 0;
    var idx = start;
    for (var k = 0; k < segLen; k++) {
        var p = points[idx];
        if (idx >= allLen || idx < 0) {
            break;
        }

        if (idx === start) {
            ctx[dir > 0 ? 'moveTo' : 'lineTo'](p[0], p[1]);
            v2Copy(cp0, p);
        }
        else {
            var nextIdx = idx + dir;
            var nextP = points[nextIdx];
            var prevP = points[prevIdx];

            if (smooth > 0) {
                var ratioNextSeg = 0.5;
                // Last point
                if (!nextP || isPointNull(nextP)) {
                    v2Copy(cp1, p);
                } else {
                    if (isPointNull(nextP)) {
                        nextP = p;
                    }

                    vec2.sub(v, nextP, prevP);

                    var lenPrevSeg;
                    var lenNextSeg;
                    lenPrevSeg = vec2.dist(p, prevP);
                    lenNextSeg = vec2.dist(p, nextP);
                    ratioNextSeg = lenNextSeg / (lenNextSeg + lenPrevSeg);

                    scaleAndAdd(cp1, p, v, -smooth * (1 - ratioNextSeg));
                }
                vec2Min(cp0, cp0, smoothMax);
                vec2Max(cp0, cp0, smoothMin);
                vec2Min(cp1, cp1, smoothMax);
                vec2Max(cp1, cp1, smoothMin);

                ctx.moveTo.apply(ctx, prevP);
                if (isOver(prevP, stackedOnPoints[idx], p)) {
                    ctx.bezierCurveTo(
                        cp0[0], cp0[1],
                        cp1[0], cp1[1],
                        p[0], p[1]
                    );
                    ctx.bezierCurveTo(
                        cp1[0], cp1[1],
                        cp0[0], cp0[1],
                        prevP[0], prevP[1]
                    );
                } else {
                    var wx = stackedOnPoints[idx][0] - p[0];
                    var wy = stackedOnPoints[idx][1] - p[1];

                    ctx.bezierCurveTo(
                        cp0[0], cp0[1],
                        cp1[0], cp1[1],
                        p[0], p[1]
                    );
                    ctx.lineTo.apply(ctx, stackedOnPoints[idx]);
                    ctx.bezierCurveTo(
                        cp1[0] + wx, cp1[1] + wy,
                        cp0[0] + wx, cp0[1] + wy,
                        stackedOnPoints[idx - 1][0], stackedOnPoints[idx - 1][1]
                    );
                    ctx.lineTo.apply(ctx, prevP);
                }
                scaleAndAdd(cp0, p, v, smooth * ratioNextSeg);
            }
            else {
                ctx.moveTo.apply(ctx, prevP);
                if (isOver(prevP, stackedOnPoints[idx], p)) {
                    ctx.lineTo.apply(ctx, p);
                    ctx.lineTo.apply(ctx, prevP);
                } else {//下降需要画面
                    ctx.lineTo.apply(ctx, p);
                    ctx.lineTo.apply(ctx, stackedOnPoints[idx]);
                    ctx.lineTo.apply(ctx, stackedOnPoints[prevIdx]);
                    ctx.lineTo.apply(ctx, prevP);
                }
            }
        }

        prevIdx = idx;
        idx += dir;
    }
    return k;
}
/**
 * 获取图形绘制极限
 * @param {*} points 
 * @param {*} smoothConstraint 
 */
function getBoundingBox(points, smoothConstraint) {
    var ptMin = [Infinity, Infinity];
    var ptMax = [-Infinity, -Infinity];
    if (smoothConstraint) {
        for (var i = 0; i < points.length; i++) {
            var pt = points[i];
            if (pt[0] < ptMin[0]) { ptMin[0] = pt[0]; }
            if (pt[1] < ptMin[1]) { ptMin[1] = pt[1]; }
            if (pt[0] > ptMax[0]) { ptMax[0] = pt[0]; }
            if (pt[1] > ptMax[1]) { ptMax[1] = pt[1]; }
        }
    }
    return {
        min: smoothConstraint ? ptMin : ptMax,
        max: smoothConstraint ? ptMax : ptMin
    };
}


export var Polygon = graphic.extendShape({

    type: 'ec-polygon',

    shape: {
        points: [],

        stackedOnPoints: [],

        smooth: 0,

        stackedOnSmooth: 0,

        smoothConstraint: true
    },

    buildPath: function (ctx, shape) {
        var points = shape.points;
        var stackedOnPoints = shape.stackedOnPoints;

        var i = 0;
        var len = points.length;
        var bbox = getBoundingBox(points, shape.smoothConstraint);
        var stackedOnBBox = getBoundingBox(stackedOnPoints, shape.smoothConstraint);

        while (i < len) {

            var k = drawNonMono(
                ctx, points, i, len, len,
                1, bbox.min, bbox.max, shape.smooth
            );

            drawNonMono(
                ctx, stackedOnPoints, i + k - 1, k, len,
                -1, stackedOnBBox.min, stackedOnBBox.max, shape.stackedOnSmooth
            );
            i += k + 1;
            ctx.closePath();
        }
    }
});


export var PolygonOver = graphic.extendShape({

    type: 'ec-polygon_over',

    shape: {
        points: [],

        stackedOnPoints: [],

        smooth: 0,

        stackedOnSmooth: 0,

        smoothConstraint: true
    },

    buildPath: function (ctx, shape) {
        var points = shape.points;
        var stackedOnPoints = shape.stackedOnPoints;

        var i = 0;
        var len = points.length;
        var bbox = getBoundingBox(points, shape.smoothConstraint);
        var stackedOnBBox = getBoundingBox(stackedOnPoints, shape.smoothConstraint);

        while (i < len) {

            var k = drawOverMono(
                ctx, points, stackedOnPoints, i, len, len,
                1, bbox.min, bbox.max, shape.smooth
            );
            i += k + 1;
            ctx.closePath();
        }
    }
});