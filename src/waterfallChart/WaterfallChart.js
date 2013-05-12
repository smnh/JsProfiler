var WaterfallChart = (function () {

	var styleElement = null,
		dev = true,
		utils;

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
			var css, cssTextNode;

			if (styleElement !== null || dev) {
				return;
			}

			css = "__CSS__";

			cssTextNode = document.createTextNode(css);

			styleElement = document.createElement("style");
			styleElement.type = "text/css";
			styleElement.appendChild(cssTextNode);

			document.getElementsByTagName("head")[0].appendChild(styleElement);
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
			
			// Process and push all the synchronous child records
			for (i = 0; i < record.children.length; i++) {
				childWcRecord = this._processRecord(record.children[i]);
				wcRecord.children.push(childWcRecord);
				wcRecord.self -= childWcRecord.duration;
			}
			
			// Push all the asynchronous child records
			if (typeof this._asyncParentRecordsMap[wcRecord.id] !== "undefined") {
				for (i = 0; i < this._asyncParentRecordsMap[wcRecord.id].length; i++) {
					childWcRecord = this._asyncParentRecordsMap[wcRecord.id][i];
					wcRecord.children.push(childWcRecord);
					wcRecord.asyncChildrenTimes.push({
						start: childWcRecord.start,
						duration: childWcRecord.duration
					});
				}
			}
			
			// Process over all children (synchronous and asynchronous) and update asynchronous times.
			for (i = 0; i < wcRecord.children.length; i++) {
				childWcRecord = wcRecord.children[i];
				wcRecord.asyncChildrenTimes = wcRecord.asyncChildrenTimes.concat(childWcRecord.asyncChildrenTimes);
				if (childWcRecord.asyncEnd > wcRecord.asyncEnd) {
					wcRecord.asyncEnd = childWcRecord.asyncEnd;
					wcRecord.asyncDuration = wcRecord.asyncEnd - wcRecord.start;
				}
			}

			return wcRecord;
		},

		_wcRecordForIndexPath: function(indexPath) {
			var i, index,
				children = this._recordsArray,
				wcRecord = null;
			
			for (i = 0; i < indexPath.length; i++) {
				index = indexPath[i];
				wcRecord = children[index];
				children = wcRecord.children;
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
		
		wcTableViewDidFoldedWcRecordViewAtIndexPath: function(indexPath) {
			var wcRecord = this._wcRecordForIndexPath(indexPath);
			wcRecord.folded = true;
		},

		wcTableViewDidUnfoldedWcRecordViewAtIndexPath: function(indexPath) {
			var wcRecord = this._wcRecordForIndexPath(indexPath);
			wcRecord.folded = false;
		},
		
		/* 
		 * WaterfallChart.WCTableView dataSource methods
		 * ---------------------------------------------
		 */
		numberOfRootRecords: function() {
			return this._flatRecordsArray.length;
		},

		cpuTimeOverviewRecordBarElementForIndex: function(index) {
			var wcRecord, cpuTimeOverviewRecordBarElm, decimalPlaces = 5;
			
			wcRecord = this._flatRecordsArray[index];
			
			cpuTimeOverviewRecordBarElm = document.createElement("div");
			cpuTimeOverviewRecordBarElm.className = "jspwc_recordBar jspwc_cpuTimeOverviewRecordBar";
			cpuTimeOverviewRecordBarElm.style.left = utils.percentWithDecimalPlaces(wcRecord.start / this._totalDuration, decimalPlaces);
			cpuTimeOverviewRecordBarElm.style.width = utils.percentWithDecimalPlaces(wcRecord.duration / this._totalDuration, decimalPlaces);
			
			return cpuTimeOverviewRecordBarElm;
		},
		
		numberOfChildWcRecordViewsForIndexPath: function(indexPath) {
			var wcRecord;
			
			if (indexPath === null) {
				return this._recordsArray.length;
			} else {
				wcRecord = this._wcRecordForIndexPath(indexPath);
				return wcRecord.children.length;
			}
		},
		
		wcRecordViewForIndexPath: function(indexPath) {
			var wcRecord, wcRecordView, i, asyncTime, decimalPlaces = 5;
			
			wcRecord = this._wcRecordForIndexPath(indexPath);
			wcRecordView = new WaterfallChart.WCRecordView({
				hasChildren: wcRecord.children.length > 0,
				isAsync: wcRecord.asyncChildrenTimes.length > 0,
				folded: wcRecord.folded,
				name: wcRecord.name
			});

			wcRecordView.setStartPosition(utils.percentWithDecimalPlaces(wcRecord.start / this._totalDuration, decimalPlaces));
			wcRecordView.setAsyncDuration(utils.percentWithDecimalPlaces(wcRecord.asyncDuration / this._totalDuration, decimalPlaces));
			wcRecordView.addChildRecordBar(
				utils.percentWithDecimalPlaces(wcRecord.start / this._totalDuration, decimalPlaces),
				utils.percentWithDecimalPlaces(wcRecord.duration / this._totalDuration, decimalPlaces)
			);
			for (i = 0; i < wcRecord.asyncChildrenTimes.length; i++) {
				asyncTime = wcRecord.asyncChildrenTimes[i];
				wcRecordView.addChildRecordBar(
					utils.percentWithDecimalPlaces(asyncTime.start / this._totalDuration, decimalPlaces),
					utils.percentWithDecimalPlaces(asyncTime.duration / this._totalDuration, decimalPlaces)
				);
			}
			wcRecordView.setSelfDuration(utils.percentWithDecimalPlaces(wcRecord.self / this._totalDuration, decimalPlaces));

			return wcRecordView;
		}
	};
	
	utils = {
		percentWithDecimalPlaces: function(number, decimalPlaces) {
			var multiplier = Math.pow(10, decimalPlaces);
			number = number * 100;
			return (Math.round(number * multiplier) / multiplier) + "%";
		}
	};
	
	return WaterfallChart;
}());

JsProfiler.WaterfallChart = WaterfallChart;