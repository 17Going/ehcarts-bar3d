var echarts = _echarts3;

var zrUtil = echarts.util;

require("./area3d/Area3dSeries");

require("./area3d/Area3dView");

var visualSymbol = require("echarts/lib/visual/symbol");

var layoutPoints = require("echarts/lib/layout/points");

// In case developer forget to include grid component
echarts.registerVisual(zrUtil.curry(visualSymbol, 'area3d', 'circle', 'area3d'));
echarts.registerLayout(zrUtil.curry(layoutPoints, 'area3d')); // Down sample after filter

// echarts.registerProcessor(echarts.PRIORITY.PROCESSOR.STATISTIC, zrUtil.curry(dataSample, 'area3d'));