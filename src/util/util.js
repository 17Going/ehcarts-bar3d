var echarts = _echarts3;
var parse = echarts.color.parse;
var zrUtil = _echarts3.util;

function rgba2hsla(color) {
    if (!color) {
        return;
    } // RGB from 0 to 255

    var rgba = parse(color);
    var R = rgba[0] / 255;
    var G = rgba[1] / 255;
    var B = rgba[2] / 255;
    var vMin = Math.min(R, G, B); // Min. value of RGB

    var vMax = Math.max(R, G, B); // Max. value of RGB

    var delta = vMax - vMin; // Delta RGB value

    var L = (vMax + vMin) / 2;
    var H;
    var S; // HSL results from 0 to 1

    if (delta === 0) {
        H = 0;
        S = 0;
    } else {
        if (L < 0.5) {
            S = delta / (vMax + vMin);
        } else {
            S = delta / (2 - vMax - vMin);
        }

        var deltaR = ((vMax - R) / 6 + delta / 2) / delta;
        var deltaG = ((vMax - G) / 6 + delta / 2) / delta;
        var deltaB = ((vMax - B) / 6 + delta / 2) / delta;

        if (R === vMax) {
            H = deltaB - deltaG;
        } else if (G === vMax) {
            H = 1 / 3 + deltaR - deltaB;
        } else if (B === vMax) {
            H = 2 / 3 + deltaG - deltaR;
        }

        if (H < 0) {
            H += 1;
        }

        if (H > 1) {
            H -= 1;
        }
    }

    var hsla = [H * 360, S, L];

    if (rgba[3] != null) {
        hsla.push(rgba[3]);
    }

    return hsla;
}


function getLight(colors) {
    var hslas = [];
    var max = 0;
    var i = 0;
    var lightColor;

    zrUtil.map(colors, function(color){
        hslas.push(rgba2hsla(color));
    });

    zrUtil.map(hslas, function(hsla){
        if (hsla[2] > max) {
            lightColor = colors[i];
            max = hsla[2];
        }
        i++;
    });

    return lightColor;
}


/**
 * 渐变色获取最亮的颜色
 * @param {*} color 
 */
function getBestLightColor(color) {
    var colorStops;
    if (!color || ! (colorStops = color.colorStops)) {
        return color;
    }

    var colors = [];

    zrUtil.map(colorStops, function (item) {
        colors.push(item.color);
    });

    return getLight(colors);
}

module.exports = getBestLightColor;