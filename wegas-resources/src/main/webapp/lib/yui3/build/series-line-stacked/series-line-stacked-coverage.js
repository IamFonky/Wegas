/*
YUI 3.10.3 (build 2fb5187)
Copyright 2013 Yahoo! Inc. All rights reserved.
Licensed under the BSD License.
http://yuilibrary.com/license/
*/

if (typeof __coverage__ === 'undefined') { __coverage__ = {}; }
if (!__coverage__['build/series-line-stacked/series-line-stacked.js']) {
   __coverage__['build/series-line-stacked/series-line-stacked.js'] = {"path":"build/series-line-stacked/series-line-stacked.js","s":{"1":0,"2":0,"3":0,"4":0},"b":{},"f":{"1":0,"2":0},"fnMap":{"1":{"name":"(anonymous_1)","line":1,"loc":{"start":{"line":1,"column":31},"end":{"line":1,"column":50}}},"2":{"name":"(anonymous_2)","line":28,"loc":{"start":{"line":28,"column":17},"end":{"line":29,"column":4}}}},"statementMap":{"1":{"start":{"line":1,"column":0},"end":{"line":49,"column":62}},"2":{"start":{"line":20,"column":0},"end":{"line":46,"column":3}},"3":{"start":{"line":30,"column":8},"end":{"line":30,"column":63}},"4":{"start":{"line":31,"column":8},"end":{"line":31,"column":43}}},"branchMap":{},"code":["(function () { YUI.add('series-line-stacked', function (Y, NAME) {","","/**"," * Provides functionality for creatiing a stacked line series."," *"," * @module charts"," * @submodule series-line-stacked"," */","/**"," * StackedLineSeries creates line graphs in which the different series are stacked along a value axis"," * to indicate their contribution to a cumulative total."," *"," * @class StackedLineSeries"," * @constructor"," * @extends  LineSeries"," * @uses StackingUtil"," * @param {Object} config (optional) Configuration parameters."," * @submodule series-line-stacked"," */","Y.StackedLineSeries = Y.Base.create(\"stackedLineSeries\", Y.LineSeries, [Y.StackingUtil], {","    /**","     * @protected","     *","     * Calculates the coordinates for the series. Overrides base implementation.","     *","     * @method setAreaData","     */","    setAreaData: function()","    {","        Y.StackedLineSeries.superclass.setAreaData.apply(this);","        this._stackCoordinates.apply(this);","    }","}, {","    ATTRS: {","        /**","         * Read-only attribute indicating the type of series.","         *","         * @attribute type","         * @type String","         * @default stackedLine","         */","        type: {","            value:\"stackedLine\"","        }","    }","});","","","}, '3.10.3', {\"requires\": [\"series-stacked\", \"series-line\"]});","","}());"]};
}
var __cov_SuspPmxfYATbMLiouUD0uA = __coverage__['build/series-line-stacked/series-line-stacked.js'];
__cov_SuspPmxfYATbMLiouUD0uA.s['1']++;YUI.add('series-line-stacked',function(Y,NAME){__cov_SuspPmxfYATbMLiouUD0uA.f['1']++;__cov_SuspPmxfYATbMLiouUD0uA.s['2']++;Y.StackedLineSeries=Y.Base.create('stackedLineSeries',Y.LineSeries,[Y.StackingUtil],{setAreaData:function(){__cov_SuspPmxfYATbMLiouUD0uA.f['2']++;__cov_SuspPmxfYATbMLiouUD0uA.s['3']++;Y.StackedLineSeries.superclass.setAreaData.apply(this);__cov_SuspPmxfYATbMLiouUD0uA.s['4']++;this._stackCoordinates.apply(this);}},{ATTRS:{type:{value:'stackedLine'}}});},'3.10.3',{'requires':['series-stacked','series-line']});
