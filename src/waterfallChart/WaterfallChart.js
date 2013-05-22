var WaterfallChart = (function () {

	var styleElement = null,
		styleSheet = null,
		dev = true;

	/**
	 * A Waterfall Chart showing JavaScript Profiling Tool records.
	 * @constructor
	 */
	function WaterfallChart() {
		this._recordsArray = null;
		this._flatRecordsArray = null;
		this._asyncParentRecordsMap = null;
		this._shown = false;
		
		this._totalDuration = 0;
		
		this._element = null;
		this._generate();
	}

	WaterfallChart.prototype = {
		constructor: WaterfallChart,
		
		_generate: function () {
			this._createElement();
			this._addStyleElement();

			this._wcTableView = new WaterfallChart.WCTableView(this._element);
			this._wcTableView.dataSource = this;
			this._wcTableView.delegate = this;
		},

		_createElement: function () {
			if (dev) {
				this._element = document.getElementsByClassName("jspwc_container")[0];
			} else {
				this._element = window.document.createElement("div");
				this._element.innerHTML = "__HTML__";
			}
		},

		_addStyleElement: function () {
			var css, cssTextNode, i;

			if (styleElement !== null) {
				return;
			}
			
			if (!dev) {
				css = "__CSS__";
	
				cssTextNode = document.createTextNode(css);
	
				styleElement = document.createElement("style");
				styleElement.type = "text/css";
				styleElement.id = "jspwc_css";
				styleElement.appendChild(cssTextNode);
	
				document.getElementsByTagName("head")[0].appendChild(styleElement);
			}
			
			for (i = document.styleSheets.length - 1; i >= 0; i--) {
				if (document.styleSheets[i].ownerNode.id === "jspwc_css") {
					styleSheet = document.styleSheets[i];
					break;
				}
			}
		},
		
		/**
		 * Sets a JsProfiler.Record as a root record of the waterfall chart.
		 *
		 * @example
		 * wfChart = new JsProfiler.WaterfallChart();
		 * wfChart.setResults(jsProfiler.getRootRecord());
		 * wfChart.show();
		 *
		 * @param {JsProfiler.Record} rootRecord
		 */
		setResults: function (rootRecord) {
			var i, record, wcRecord;

			this._recordsArray = [];
			this._flatRecordsArray = [];
			this._asyncParentRecordsMap = {};
			this._absoluteStart = rootRecord.start;
			this._totalDuration = rootRecord.end - rootRecord.start;
			
			this._wcTableView.setTotalDuration(this._totalDuration);
			
			// Create two arrays - _flatRecordsArray which has the same structure as the original record data but with
			// WaterfallChart.WCRecordModel instead of JsProfiler.Record, and _recordsArray which has all the
			// asynchronous records as child of their asynchronous parents.
			for (i = rootRecord.children.length - 1; i >= 0; i--) {
				record = rootRecord.children[i];
				wcRecord = this._processRecord(record);
				// Asynchronous records could only be level 0 records.
				if (!wcRecord.async) {
					this._recordsArray.unshift(wcRecord);
				} else {
					if (typeof this._asyncParentRecordsMap[wcRecord.asyncParentId] === "undefined") {
						this._asyncParentRecordsMap[wcRecord.asyncParentId] = [];
					}
					this._asyncParentRecordsMap[wcRecord.asyncParentId].unshift(wcRecord)
				}
				this._flatRecordsArray.unshift(wcRecord);
			}
		},
		
		/**
		 * @param {JsProfiler.Record} record
		 * @returns {WaterfallChart.WCRecordModel}
		 * @private
		 */
		_processRecord: function (record) {
			var i, wcRecord, childWcRecord;

			wcRecord = new WaterfallChart.WCRecordModel(record, this._absoluteStart);
			
			// Recursively process and add all the synchronous child records.
			for (i = 0; i < record.children.length; i++) {
				childWcRecord = this._processRecord(record.children[i]);
				wcRecord.addRecord(childWcRecord);
			}
			
			// Add all the asynchronous child records.
			if (typeof this._asyncParentRecordsMap[wcRecord.id] !== "undefined") {
				for (i = 0; i < this._asyncParentRecordsMap[wcRecord.id].length; i++) {
					childWcRecord = this._asyncParentRecordsMap[wcRecord.id][i];
					wcRecord.addRecord(childWcRecord);
				}
			}
			
			return wcRecord;
		},

		/**
		 * Returns WCRecordModel located at indexPath in synchronous or asynchronous context.
		 * 
		 * @param {Array} indexPath
		 * @param {Boolean} async
		 * @returns {WaterfallChart.WCRecordModel}
		 * @private
		 */
		_wcRecordForIndexPath: function(indexPath, async) {
			var i, index,
				children = async ? this._recordsArray : this._flatRecordsArray,
				wcRecord = null;
			
			for (i = 0; i < indexPath.length; i++) {
				index = indexPath[i];
				if (index >= children.length) {
					throw new Error("indexPath is out of range for " + (async ? "asynchronous" : "synchronous") + " records: ", indexPath);
				}
				wcRecord = children[index];
				children = async ? wcRecord.allChildren : wcRecord.children;
			}
			
			return wcRecord;
		},
		
		/**
		 * Shows the waterfall chart.
		 */
		show: function() {
			if (this._shown) {
				return;
			}
			this._shown = true;
			
			document.body.appendChild(this._element);
			
			this._wcTableView.layoutElements();
			this._wcTableView.reloadData();
		},
		
		hide: function() {
			if (!this._shown) {
				return;
			}
			this._shown = false;
			this._element.parentNode.removeChild(this._element);
		},

		/* 
		 * WaterfallChart.WCTableView delegate methods
		 * -------------------------------------------
		 */
		wcTableViewDidClickClose: function() {
			this.hide();
		},
		
		wcTableViewDidFoldedWcRecordViewAtIndexPath: function(indexPath, async) {
			var wcRecord = this._wcRecordForIndexPath(indexPath, async);
			wcRecord.folded = true;
		},

		wcTableViewDidUnfoldedWcRecordViewAtIndexPath: function(indexPath, async) {
			var wcRecord = this._wcRecordForIndexPath(indexPath, async);
			wcRecord.folded = false;
		},
		
		/* 
		 * WaterfallChart.WCTableView dataSource methods
		 * ---------------------------------------------
		 */
		cpuTimeOverviewRecordBarElementForIndex: function(index) {
			var wcRecord, cpuTimeOverviewRecordBarElm, decimalPlaces = 5;
			
			wcRecord = this._flatRecordsArray[index];
			
			cpuTimeOverviewRecordBarElm = document.createElement("div");
			cpuTimeOverviewRecordBarElm.className = "jspwc_recordBar jspwc_cpuTimeOverviewRecordBar";
			cpuTimeOverviewRecordBarElm.style.left = WaterfallChart.utils.percentWithDecimalPlaces(wcRecord.start / this._totalDuration, decimalPlaces);
			cpuTimeOverviewRecordBarElm.style.width = WaterfallChart.utils.percentWithDecimalPlaces(wcRecord.duration / this._totalDuration, decimalPlaces);
			
			return cpuTimeOverviewRecordBarElm;
		},
		
		numberOfChildWcRecordViewsForIndexPath: function(indexPath, async) {
			var wcRecord;
			
			if (indexPath === null) {
				return async ? this._recordsArray.length : this._flatRecordsArray.length;
			} else {
				wcRecord = this._wcRecordForIndexPath(indexPath, async);
				return async ? wcRecord.allChildren.length : wcRecord.children.length;
			}
		},
		
		wcRecordViewForIndexPath: function(indexPath, async) {
			var wcRecord, wcRecordView, i, asyncTime;
			
			wcRecord = this._wcRecordForIndexPath(indexPath, async);
			wcRecordView = new WaterfallChart.WCRecordView({
				hasChildren: async ? wcRecord.allChildren.length > 0 : wcRecord.children.length,
				hasAsyncDescendants: async ? wcRecord.asyncChildrenTimes.length > 0 : false,
				folded: wcRecord.folded,
				name: wcRecord.name
			});

			wcRecordView.setStartPosition(wcRecord.start / this._totalDuration);
			wcRecordView.setAsyncDuration(async ? wcRecord.asyncDuration / this._totalDuration : wcRecord.duration / this._totalDuration);
			wcRecordView.addChildRecordBar(wcRecord.start / this._totalDuration, wcRecord.duration / this._totalDuration);
			if (async) {
				for (i = 0; i < wcRecord.asyncChildrenTimes.length; i++) {
					asyncTime = wcRecord.asyncChildrenTimes[i];
					wcRecordView.addChildRecordBar(asyncTime.start / this._totalDuration, asyncTime.duration / this._totalDuration);
				}
			}
			wcRecordView.setSelfDuration(wcRecord.self / this._totalDuration);

			return wcRecordView;
		}
	};
	
	WaterfallChart.utils = {
		percentWithDecimalPlaces: function(number, decimalPlaces) {
			var multiplier = Math.pow(10, decimalPlaces);
			number = number * 100;
			return (Math.round(number * multiplier) / multiplier) + "%";
		},
		cssRuleForSelector: function(selector) {
			var i, cssRule = null;
			if (styleSheet) {
				for (i = 0; i < styleSheet.cssRules.length; i++) {
					if (styleSheet.cssRules[i].cssText.indexOf(selector) > -1) {
						cssRule = styleSheet.cssRules[i];
						break;
					}
				}
			}
			return cssRule;
		},
		getCssRulePropertyValue: function(cssRule, property) {
			var regExp, match;
			regExp = new RegExp(property + "\\s*:\\s*([^;]*)");
			match = regExp.exec(cssRule.cssText);
			return match ? match[1] : null;
		},
		setCssRulePropertyValue: function(cssRule, property, value) {
			var regExp;
			if (cssRule.cssText.indexOf(property) > -1) {
				regExp = new RegExp(property + "\\s*:[^;]*");
				cssRule.cssText = cssRule.cssText.replace(regExp, property + ":" + value);
			} else {
				cssRule.cssText += property + ":" + value + ";";
			}
		}
	};
	
	return WaterfallChart;
}());

JsProfiler.WaterfallChart = WaterfallChart;