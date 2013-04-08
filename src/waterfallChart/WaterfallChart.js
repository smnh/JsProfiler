(function () {

	var styleElement = null,
		dev = true,
		utils;

	/**
	 * @param {JsProfiler.Record} record
	 * @param {Number} absoluteStart
	 * @constructor
	 */
	function WCRecord(record, absoluteStart) {
		this.name = record.name;
		this.async = record.async;
		this.start = record.start - absoluteStart;
		this.end = record.end - absoluteStart;
		this.duration = this.end - this.start;
		this.self = this.duration;
		this.asyncEnd = this.end;
		this.asyncDuration = this.duration;
		this.asyncTimes = [];
		this.children = [];
		this.folded = true;
	}
	
	/**
	 * A Waterfall Chart showing JavaScript Profiling Tool records.
	 * @constructor
	 */
	function WaterfallChart() {
		this._recordsArray = null;
		this._shown = dev;
		this._totalDuration = 0;
		this._element = null;
		this._elements = {};
		this._generate();
	}

	JsProfiler.WaterfallChart = WaterfallChart;
	
	WaterfallChart.prototype = {
		constructor: WaterfallChart,

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
		 * Shows the waterfall chart.
		 */
		show: function () {
			// TODO: TBD
			this._shown = true;
			
			this._layoutElements();
			this._attachEvents();
			this._createGridLines();
			this._createRootRecordViews();
		},

		_generate: function() {
			this._createElement();
			this._addStyleElement();

			this._elements.table = this._element.querySelector(".jsp_wc_table");
			this._elements.bodyOverlays = this._element.querySelector(".jsp_wc_bodyOverlays");
			this._elements.timeline = this._element.querySelector(".jsp_wc_timeline");
			this._elements.timelineGridlinesContainer = this._element.querySelector(".jsp_wc_timelineGridLinesContainer");
			this._elements.recordGridlinesContainer = this._element.querySelector(".jsp_wc_recordGridLinesContainer");
			this._elements.recordGridlinesContainer = this._element.querySelector(".jsp_wc_recordGridLinesContainer");
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
		 * @param {JsProfiler.Record} record
		 * @returns {WCRecord}
		 * @private
		 */
		_processRecord: function (record) {
			var i, wcRecord, childWcRecord;

			wcRecord = new WCRecord(record, this._absoluteStart);

			for (i = 0; i < record.children.length; i++) {
				childWcRecord = this._processRecord(record.children[i]);
				wcRecord.children.push(childWcRecord);
				
				if (!childWcRecord.async) {
					// Synchronous child
					wcRecord.self -= childWcRecord.duration;
				} else  {
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

		_layoutElements: function() {
			var paddingRight = 5,
				bodyOverlaysWidth = this._elements.bodyOverlays.offsetWidth,
				timeLineWidth = this._elements.recordRowsBackground.offsetWidth,
				scrollBarWidth = bodyOverlaysWidth - timeLineWidth;
				
			this._elements.timeline.style.right = scrollBarWidth + "px";
			this._elements.recordGridlinesContainer.style.right = (scrollBarWidth + paddingRight) + "px";

			this._elements.resizeHandle.style.width = (scrollBarWidth - 2) + "px";
			this._elements.resizeHandle.style.height = (scrollBarWidth - 2) + "px";
		},

		_attachEvents: function() {
			this._elements.resizeHandle.addEventListener("mousedown", this, false);
		},
		
		handleEvent: function(event) {
			// TODO: refactor
			if (event.type === "mousedown" && event.target === this._elements.resizeHandle) {
				// Prevent text selection
				event.preventDefault();
				this._resizeStartPosition = {
					x: event.pageX,
					y: event.pageY
				};
				this._resizeStartSize = {
					width: this._elements.table.clientWidth,
					height: this._elements.scrollView.offsetHeight
				};
				document.addEventListener("mousemove", this, false);
				document.addEventListener("mouseup", this, false);
			} else {
				switch (event.type) {
					case "mousemove":
						this._elements.table.style.width = (this._resizeStartSize.width + (event.pageX - this._resizeStartPosition.x) * 2) + "px";
						this._elements.scrollView.style.height = (this._resizeStartSize.height + (event.pageY - this._resizeStartPosition.y)) + "px";
						break;
					case "mouseup":
						document.removeEventListener("mousemove", this, false);
						document.removeEventListener("mouseup", this, false);
						break;
				}
			}
		},
		
		_createGridLines: function() {
			var timeLineScaleWidth,
				minGridLineSpace = 60,
				numOfColumns, columnRatio, columnWidth, numOfGridLines,
				gridLineTmp, gridLineElm, gridLineLabelTmp, gridLineLabelElm,
				i, gridLineTime;

			gridLineTmp = document.createElement("div");
			gridLineTmp.className = "jsp_wc_recordGridLine";

			gridLineLabelTmp = document.createElement("div");
			gridLineLabelTmp.className = "jsp_wc_gridLineLabel";

			timeLineScaleWidth = this._elements.timeline.offsetWidth;
			
			numOfColumns = Math.floor(timeLineScaleWidth / minGridLineSpace);
			
			if (numOfColumns < 1) {
				numOfColumns = 1;
			}
			
			columnRatio = 1 / numOfColumns;
			columnWidth = 100 * columnRatio;
			numOfGridLines = numOfColumns + 1;
			
			for (i = 0; i < numOfGridLines; i++) {
				gridLineElm = gridLineTmp.cloneNode(true);
				gridLineElm.style.left = columnWidth * i + "%";

				this._elements.recordGridlinesContainer.appendChild(gridLineElm);
				
				gridLineTime = this._totalDuration * i * columnRatio;

				gridLineLabelElm = gridLineLabelTmp.cloneNode(true);
				gridLineLabelElm.appendChild(document.createTextNode(gridLineTime ? utils.timeString(gridLineTime) : "0"));

				gridLineElm = gridLineElm.cloneNode(true);
				gridLineElm.appendChild(gridLineLabelElm);
				this._elements.timelineGridlinesContainer.appendChild(gridLineElm);
			}
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
		 * @param {WCRecord} wcRecord
		 * @returns {WCRecordView}
		 * @private
		 */
		_createWcRecordView: function(wcRecord) {
			var wcRecordView, i, asyncTime, decimalPlaces = 5;

			wcRecordView = new WCRecordView(wcRecord);
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
			this._elements.recordNamesBackground.appendChild(div.cloneNode(true));
			this._elements.recordRowsBackground.appendChild(div.cloneNode(true));
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
		 * WaterfallChart.WCRecordView delegate methods
		 */
		
		wcRecordViewFolded: function (wcRecordView) {
			var wcRecord = wcRecordView.wcRecord;
			wcRecord.folded = true;
			this._foldRecord(wcRecord);
		},

		wcRecordViewUnfolded: function (wcRecordView) {
			var wcRecord = wcRecordView.wcRecord;
			wcRecord.folded = false;
			this._unfoldRecordView(wcRecordView);
		}
	};

	/**
	 * @param {WCRecord} wcRecord
	 * @constructor
	 */
	function WCRecordView(wcRecord) {
		
		var hasChildren = wcRecord.children.length > 0,
			isAsync = wcRecord.asyncDuration > wcRecord.duration;
		
		this.wcRecord = wcRecord;
		this.folded = wcRecord.folded;
		this.childWcRecordViews = [];
		this.delegate = null;
		
		this._generateRecordNameElement(wcRecord.name);
		this._generateRecordElement(hasChildren, isAsync);
	}
	
	WCRecordView.prototype = {
		constructor: WaterfallChart,

		/**
		 * Sets the start position of the record view by applying passed string to the margin-left property of the
		 * record element.
		 * 
		 * @param {String} start The start position of the record in form of CSS length of percentage.
		 */
		setStartPosition: function (start) {
			this.recordElm.style.marginLeft = start;
		},

		setAsyncDuration: function (asyncDuration) {
			if (this.asyncRecordBarElm !== null) {
				this.asyncRecordBarElm.style.width = asyncDuration;
			}
		},

		addChildRecordBar: function(start, duration) {
			var childRecordBar = document.createElement("div");
			childRecordBar.className = "jsp_wc_recordBar jsp_wc_childRecordBar";
			childRecordBar.style.left = start;
			childRecordBar.style.width = duration;
			this.selfRecordBarElm.parentNode.insertBefore(childRecordBar, this.selfRecordBarElm);
		},
		
		setSelfDuration: function (selfDuration) {
			this.selfRecordBarElm.style.width = selfDuration;
		},

		_generateRecordNameElement: function(recordName) {
			var recordNameElement;

			recordNameElement = document.createElement("div");
			recordNameElement.className = "jsp_wc_row";
			recordNameElement.appendChild(document.createTextNode(recordName));
			
			this.recordNameContainerElm = document.createElement("div");
			this.recordNameContainerElm.className = "jsp_wc_recordNameContainer";
			this.recordNameContainerElm.appendChild(recordNameElement);
		},

		_generateRecordElement: function(hasChildren, isAsync) {
			var containmentTools, recordBracket, recordBarsContainer;
			
			this.recordElm = document.createElement("div");
			this.recordElm.className = "jsp_wc_record";

			if (hasChildren) {
				containmentTools = document.createElement("div");
				containmentTools.className = "jsp_wc_containmentTools";
				
				recordBracket = document.createElement("div");
				recordBracket.className = "jsp_wc_recordBracket";
				containmentTools.appendChild(recordBracket);

				this.foldHandleElm = document.createElement("div");
				this.foldHandleElm.className = this.folded ? "jsp_wc_foldHandleFolded" : "jsp_wc_foldHandleUnfolded";
				this.foldHandleElm.addEventListener("click", this, false);
				containmentTools.appendChild(this.foldHandleElm);
				
				this.recordElm.appendChild(containmentTools);
			} else {
				this.foldHandleElm = null;
			}
			
			recordBarsContainer = document.createElement("div");
			recordBarsContainer.className = "jsp_wc_recordBarsContainer";
			
			if (isAsync) {
				this.asyncRecordBarElm = document.createElement("div");
				this.asyncRecordBarElm.className = "jsp_wc_recordBar jsp_wc_asyncRecordBar";
				recordBarsContainer.appendChild(this.asyncRecordBarElm);
			} else {
				this.asyncRecordBarElm = null;
			}
			
			this.selfRecordBarElm = document.createElement("div");
			this.selfRecordBarElm.className = "jsp_wc_recordBar jsp_wc_selfRecordBar";
			recordBarsContainer.appendChild(this.selfRecordBarElm);
			
			this.recordElm.appendChild(recordBarsContainer);

			this.recordContainerElm = document.createElement("div");
			this.recordContainerElm.className = "jsp_wc_recordContainer";
			this.recordContainerElm.appendChild(this.recordElm);
		},
		
		addChildWcRecordView: function(childWcRecordView) {
			this.childWcRecordViews.push(childWcRecordView);
			this.recordContainerElm.appendChild(childWcRecordView.recordContainerElm);
			this.recordNameContainerElm.appendChild(childWcRecordView.recordNameContainerElm);
		},
		
		removeAllChildWcRecordView: function() {
			var childWcRecordView;
			
			while (this.childWcRecordViews.length) {
				childWcRecordView = this.childWcRecordViews.pop();
				childWcRecordView.recordContainerElm.parentNode.removeChild(childWcRecordView.recordContainerElm);
				childWcRecordView.recordNameContainerElm.parentNode.removeChild(childWcRecordView.recordNameContainerElm);
			}
		},
		
		unfold: function unfold() {
			this.folded = false;
			this.foldHandleElm.className = "jsp_wc_foldHandleUnfolded";
			
			if (this.delegate && typeof this.delegate.wcRecordViewUnfolded === "function") {
				this.delegate.wcRecordViewUnfolded(this);
			}
		},
		
		fold: function fold() {
			this.folded = true;
			this.foldHandleElm.className = "jsp_wc_foldHandleFolded";
			
			this.removeAllChildWcRecordView();
			
			if (this.delegate && typeof this.delegate.wcRecordViewFolded === "function") {
				this.delegate.wcRecordViewFolded(this);
			}
		},
		
		toggle: function toggle() {
			if (!this.folded) {
				this.fold();
			} else {
				this.unfold();
			}
		},
		
		handleEvent: function(event) {
			if (event.target === this.foldHandleElm) {
				this.toggle();
			}
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
				timeStr = Math.round(timeMs / 100) / 10 + " s";
			} else {
				timeStr = Math.round(timeMs) + " ms";
			}
			return timeStr;
		}
	};
	
}());