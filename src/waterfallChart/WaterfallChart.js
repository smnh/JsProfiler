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
//		this._shown = dev;
		
		this._totalDuration = 0;
		this._numberOfGridlines = 0;
		
		this._timelineOverviewStart = 0;
		this._timelineOverviewEnd = 100;
		this._timelineOverviewWidth = null;
		
		this._eventState = "idle";
		this._startEventPagePosition = null;
		this._startEventSize = null;
		
		this._element = null;
		this._elements = {};
		this._generate();
	}

	WaterfallChart.prototype = {
		constructor: WaterfallChart,
		
		_generate: function () {
			this._createElement();
			this._addStyleElement();

			
			this._timelineOverview = new WaterfallChart.TimelineOverview(this._element);
			this._timelineOverview.delegate = this;

			this._elements.table = this._element.querySelector(".jsp_wc_table");
			this._elements.bodyOverlays = this._element.querySelector(".jsp_wc_bodyOverlays");
			this._elements.timeline = this._element.querySelector(".jsp_wc_timeline");
			this._elements.timelineGridlinesContainer = this._element.querySelector(".jsp_wc_timelineGridlinesContainer");
			this._elements.recordGridlinesContainer = this._element.querySelector(".jsp_wc_recordGridlinesContainer");
			this._elements.resizeHandle = this._element.querySelector(".jsp_wc_resizeHandle");
			this._elements.scrollView = this._element.querySelector(".jsp_wc_scrollView");
			this._elements.recordNamesBackground = this._element.querySelector(".jsp_wc_recordNamesBackground");
			this._elements.recordNames = this._element.querySelector(".jsp_wc_recordNames");
			this._elements.recordRowsBackground = this._element.querySelector(".jsp_wc_recordRowsBackground");
			this._elements.records = this._element.querySelector(".jsp_wc_records");

			if (dev) {
				this._elements.recordNamesBackground.innerHTML = "";
				this._elements.recordNames.innerHTML = "";
				this._elements.recordRowsBackground.innerHTML = "";
				this._elements.records.innerHTML = "";
			}
		},

		_createElement: function () {
			if (dev) {
				this._element = document.getElementsByClassName("jsp_wc_container")[0];
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
			this._absoluteStart = rootRecord.start;
			this._totalDuration = rootRecord.end - rootRecord.start;

			for (i = 0; i < rootRecord.children.length; i++) {
				record = rootRecord.children[i];
				wcRecord = this._processRecord(record);
				this._recordsArray.push(wcRecord);
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
		show: function () {
			// TODO: TBD
//			this._shown = true;
			
			this._layoutElements();
			this._attachEvents();
			this._updateGridlines();
			this._createRootRecordViews();
		},

		_layoutElements: function() {
			var paddingRight = 5,
				bodyOverlaysWidth = this._elements.bodyOverlays.offsetWidth,
				timeLineWidth = this._elements.recordRowsBackground.offsetWidth,
				scrollBarWidth = bodyOverlaysWidth - timeLineWidth;

			this._timelineOverview.setMarginRight(scrollBarWidth + paddingRight);
			this._timelineOverview.setLeftHandlePosition(this._timelineOverviewStart);
			this._timelineOverview.setRightHandlePosition(this._timelineOverviewEnd);
			
			this._timelineOverviewWidth = this._timelineOverview.getOffsetWidth();
			
			this._elements.timeline.style.right = scrollBarWidth + "px";
			this._elements.recordGridlinesContainer.style.right = (scrollBarWidth + paddingRight) + "px";

			this._elements.resizeHandle.style.width = (scrollBarWidth - 2) + "px";
			this._elements.resizeHandle.style.height = (scrollBarWidth - 2) + "px";
		},

		_attachEvents: function() {
			this._elements.resizeHandle.addEventListener("mousedown", this, false);
		},
		
		_eventStates: {
			idle: {
				start: function(event) {
					event.preventDefault(); // Prevent text selection
					
					document.addEventListener("mousemove", this, false);
					document.addEventListener("mouseup", this, false);
					
					this._startEventPagePosition = {
						x: event.pageX,
						y: event.pageY
					};
					
					if (event.target === this._elements.resizeHandle) {
						this._eventState = "resizeHandleGrabbed";
						this._startEventSize = {
							width: this._elements.table.clientWidth,
							height: this._elements.scrollView.offsetHeight
						};
					}
				}
			},
			resizeHandleGrabbed: {
				move: function() {
					this._elements.table.style.width = (this._startEventSize.width + (event.pageX - this._startEventPagePosition.x) * 2) + "px";
					this._elements.scrollView.style.height = (this._startEventSize.height + (event.pageY - this._startEventPagePosition.y)) + "px";
					this._timelineOverviewWidth = this._timelineOverview.getOffsetWidth();
					this._updateGridlines();
				},
				end: function() {
					document.removeEventListener("mousemove", this, false);
					document.removeEventListener("mouseup", this, false);
					this._eventState = "idle";
				}
			}
		},
		
		handleEvent: function(event) {
			var eventHandlerName;
			switch (event.type) {
				case "mousedown":
					eventHandlerName = "start";
					break;
				case "mousemove":
					eventHandlerName = "move";
					break;
				case "mouseup":
					eventHandlerName = "end";
					break;
			}
			this._eventStates[this._eventState][eventHandlerName].call(this, event);
		},
		
		_updateGridlines: function() {
			var numOfColumns, columnRatio, columnWidthPercent, columnLeft, numOfGridlines,
				timelineStart, timelineDuration,
				i, time, timeStr, reuseNumberOfGridlines,
				gridlineElm, gridlineLabelElm,
				minGridlineSpace = 60;

			numOfColumns = Math.floor(this._timelineOverviewWidth / minGridlineSpace);

			if (numOfColumns < 1) {
				numOfColumns = 1;
			}

			columnRatio = 1 / numOfColumns;
			columnWidthPercent = 100 * columnRatio;
			numOfGridlines = numOfColumns + 1;
			
			if (numOfGridlines !== this._numberOfGridlines) {
				
				timelineStart = this._totalDuration * this._timelineOverviewStart / 100;
				timelineDuration = this._totalDuration * (this._timelineOverviewEnd - this._timelineOverviewStart) / 100;
				
				reuseNumberOfGridlines = Math.min(numOfGridlines, this._numberOfGridlines);
				
				// First, reuse all existing grid-line elements.
				for (i = 0; i < reuseNumberOfGridlines; i++) {
					columnLeft = (columnWidthPercent * i) + "%";
					
					this._elements.recordGridlinesContainer.childNodes[i].style.left = columnLeft;
	
					time = timelineStart + timelineDuration * i * columnRatio;
					timeStr = (time === 0 ? "0" : utils.timeString(time));
					this._elements.timelineGridlinesContainer.childNodes[i].style.left = columnLeft;
					this._elements.timelineGridlinesContainer.childNodes[i].childNodes[0].childNodes[0].nodeValue = timeStr;
	
					time = this._totalDuration * i * columnRatio;
					timeStr = (time === 0 ? "0" : utils.timeString(time));
					this._timelineOverview.gridlinesContainer.childNodes[i].style.left = columnLeft;
					this._timelineOverview.gridlinesContainer.childNodes[i].childNodes[0].childNodes[0].nodeValue = timeStr;
				}
				
				// Create new grid-line elements
				for (i; i < numOfGridlines; i++) {
					columnLeft = (columnWidthPercent * i) + "%";
					
					gridlineElm = document.createElement("div");
					gridlineElm.className = "jsp_wc_recordGridline";
					gridlineElm.style.left = columnLeft;
					this._elements.recordGridlinesContainer.appendChild(gridlineElm);
	
					time = this._totalDuration * i * columnRatio;
					timeStr = (time === 0 ? "0" : utils.timeString(time));
					gridlineLabelElm = document.createElement("div");
					gridlineLabelElm.className = "jsp_wc_gridlineLabel";
					gridlineLabelElm.appendChild(document.createTextNode(timeStr));
	
					gridlineElm = gridlineElm.cloneNode(false);
					gridlineElm.appendChild(gridlineLabelElm);
					this._timelineOverview.gridlinesContainer.appendChild(gridlineElm);
					
					time = timelineStart + timelineDuration * i * columnRatio;
					timeStr = (time === 0 ? "0" : utils.timeString(time));
					gridlineLabelElm = gridlineLabelElm.cloneNode(false);
					gridlineLabelElm.appendChild(document.createTextNode(timeStr));
					
					gridlineElm = gridlineElm.cloneNode(false);
					gridlineElm.appendChild(gridlineLabelElm);
					this._elements.timelineGridlinesContainer.appendChild(gridlineElm);
				}
				
				// Remove unnecessary grid-lines
				for (i = this._numberOfGridlines - 1; i >= numOfGridlines; i--) {
					this._elements.recordGridlinesContainer.removeChild(this._elements.recordGridlinesContainer.lastChild);
					this._elements.timelineGridlinesContainer.removeChild(this._elements.timelineGridlinesContainer.lastChild);
					this._timelineOverview.gridlinesContainer.removeChild(this._timelineOverview.gridlinesContainer.lastChild);
				}
				
				this._numberOfGridlines = numOfGridlines;
			}
			
			this._updateRecords();
		},

		_updateGridlineTimes: function() {
			var numOfColumns = this._numberOfGridlines - 1,
				columnRatio = 1 / numOfColumns,
				timelineStart = this._totalDuration * this._timelineOverviewStart / 100,
				timelineDuration = this._totalDuration * (this._timelineOverviewEnd - this._timelineOverviewStart) / 100,
				i, time, timeStr;

			for (i = 0; i < this._numberOfGridlines; i++) {
				time = timelineStart + timelineDuration * i * columnRatio;
				timeStr = (time === 0 ? "0" : utils.timeString(time));
				this._elements.timelineGridlinesContainer.childNodes[i].childNodes[0].childNodes[0].nodeValue = timeStr;
			}
			
			this._updateRecords();
		},
		
		_updateRecords: function() {
			this._elements.records.style.width = this._timelineOverviewWidth * 100 / (this._timelineOverviewEnd - this._timelineOverviewStart) + "px";
			this._elements.records.style.left = -this._timelineOverviewStart * this._timelineOverviewWidth / (this._timelineOverviewEnd - this._timelineOverviewStart) + "px";
		},
		
		_createRootRecordViews: function () {
			var wcRecord, wcRecordView;
			
			this._elements.recordNames.innerHTML = "";
			this._elements.records.innerHTML = "";
			
			for (var i = 0; i < this._recordsArray.length; i++) {
				wcRecord = this._recordsArray[i];
				wcRecordView = this._createWcRecordView(wcRecord);
				
				this._elements.records.appendChild(wcRecordView.recordContainerElm);
				this._elements.recordNames.appendChild(wcRecordView.recordNameContainerElm);
			}
		},

		/**
		 * 
		 * @param {WaterfallChart.WCRecordModel} wcRecord
		 * @returns {WaterfallChart.WCRecordView}
		 * @private
		 */
		_createWcRecordView: function(wcRecord) {
			var wcRecordView, i, asyncTime, decimalPlaces = 5;

			wcRecordView = new WaterfallChart.WCRecordView(wcRecord);
			wcRecordView.delegate = this;

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

			this._addBackgroundRow();

			if (wcRecord.folded === false) {
				this._unfoldRecordView(wcRecordView);
			}
			
			return wcRecordView;
		},
		
		_addBackgroundRow: function() {
			var div = document.createElement("div");
			div.className = "jsp_wc_row";
			this._elements.recordNamesBackground.appendChild(div.cloneNode(false));
			this._elements.recordRowsBackground.appendChild(div.cloneNode(false));
		},

		_removeBackgroundRow: function () {
			this._elements.recordNamesBackground.removeChild(this._elements.recordNamesBackground.lastChild);
			this._elements.recordRowsBackground.removeChild(this._elements.recordRowsBackground.lastChild);
		},
		
		_foldRecord: function(wcRecord) {
			var i;
			
			for (i = 0; i < wcRecord.children.length; i++) {
				this._removeBackgroundRow();
				if (wcRecord.children[i].folded === false) {
					this._foldRecord(wcRecord.children[i]);
				}
			}
		},
		
		_unfoldRecordView: function (wcRecordView) {
			var i, childWcRecordView, childWcRecord,
				wcRecord = wcRecordView.wcRecord;

			for (i = 0; i < wcRecord.children.length; i++) {
				childWcRecord = wcRecord.children[i];
				childWcRecordView = this._createWcRecordView(childWcRecord);

				wcRecordView.addChildWcRecordView(childWcRecordView);
			}
		},

		/*
		 * Timeline delegate methods
		 * -------------------------
		 */

		/**
		 * 
		 * @param {WaterfallChart.TimelineOverview} timeline
		 */
		timelineDidChangedHandlesPosition: function(timeline) {
			this._timelineOverviewStart = timeline.getLeftHandlePosition();
			this._timelineOverviewEnd = timeline.getRightHandlePosition();
			this._updateGridlineTimes();
		},
		
		/* 
		 * WaterfallChart.WCRecordView delegate methods
		 * -----------------------------
		 */

		/**
		 * @param {WaterfallChart.WCRecordView} wcRecordView
		 */
		wcRecordViewFolded: function (wcRecordView) {
			var wcRecord = wcRecordView.wcRecord;
			wcRecord.folded = true;
			this._foldRecord(wcRecord);
		},

		/**
		 * @param {WaterfallChart.WCRecordView} wcRecordView
		 */
		wcRecordViewUnfolded: function (wcRecordView) {
			var wcRecord = wcRecordView.wcRecord;
			wcRecord.folded = false;
			this._unfoldRecordView(wcRecordView);
		}
	};
	
	utils = {
		percentWithDecimalPlaces: function(number, decimalPlaces) {
			var multiplier = Math.pow(10, decimalPlaces);
			number = number * 100;
			return (Math.round(number * multiplier) / multiplier) + "%";
		},
		timeString: function(timeMs) {
			var timeStr;
			if (timeMs >= 1000) {
				timeStr = Math.round(timeMs / 10) / 100 + " s";
			} else {
				timeStr = Math.round(timeMs) + " ms";
			}
			return timeStr;
		}
	};
	
	return WaterfallChart;
}());

JsProfiler.WaterfallChart = WaterfallChart;