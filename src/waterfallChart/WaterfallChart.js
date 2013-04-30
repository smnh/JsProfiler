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
			this._absoluteStart = rootRecord.start;
			this._totalDuration = rootRecord.end - rootRecord.start;
			
			this._wcTableView.setTotalDuration(this._totalDuration);
			
			// Create hierarchy of WaterfallChart.WCRecordModel and push them to _recordsArray
			for (i = 0; i < rootRecord.children.length; i++) {
				record = rootRecord.children[i];
				wcRecord = this._processRecord(record);
				this._recordsArray.push(wcRecord);
				this._flatRecordsArray.push(wcRecord);
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

			for (i = 0; i < record.children.length; i++) {
				childWcRecord = this._processRecord(record.children[i]);
				wcRecord.children.push(childWcRecord);

				if (!childWcRecord.async) {
					// Synchronous child
					wcRecord.self -= childWcRecord.duration;
				} else {
					// Asynchronous child
					wcRecord.asyncTimes.push({
						start: childWcRecord.start,
						duration: childWcRecord.duration
					});

					this._flatRecordsArray.push(childWcRecord);
				}

				wcRecord.asyncTimes = wcRecord.asyncTimes.concat(childWcRecord.asyncTimes);

				if (childWcRecord.asyncEnd > wcRecord.asyncEnd) {
					wcRecord.asyncEnd = childWcRecord.asyncEnd;
					wcRecord.asyncDuration = wcRecord.asyncEnd - wcRecord.start;
				}
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
		
		/* 
		 * WaterfallChart.WCTableView dataSource methods
		 * ---------------------------------------------
		 */
		numberOfRootRecords: function() {
			return  this._flatRecordsArray.length;
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
		
		numberOfChildWcRecordViews: function(wcRecordView) {
			if (wcRecordView) {
				return wcRecordView.wcRecord.children.length;
			} else {
				return this._recordsArray.length;
			}
		},
		
		childWcRecordView: function(wcRecordView, childIndex) {
			var i, asyncTime, decimalPlaces = 5, wcRecord;
			
			if (wcRecordView) {
				wcRecord = wcRecordView.wcRecord.children[childIndex];
			} else {
				wcRecord = this._recordsArray[childIndex];
			}
			
			wcRecordView = new WaterfallChart.WCRecordView(wcRecord);

			wcRecordView.setStartPosition(utils.percentWithDecimalPlaces(wcRecord.start / this._totalDuration, decimalPlaces));
			wcRecordView.setAsyncDuration(utils.percentWithDecimalPlaces(wcRecord.asyncDuration / this._totalDuration, decimalPlaces));
			wcRecordView.addChildRecordBar(
				utils.percentWithDecimalPlaces(wcRecord.start / this._totalDuration, decimalPlaces),
				utils.percentWithDecimalPlaces(wcRecord.duration / this._totalDuration, decimalPlaces)
			);
			for (i = 0; i < wcRecord.asyncTimes.length; i++) {
				asyncTime = wcRecord.asyncTimes[i];
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