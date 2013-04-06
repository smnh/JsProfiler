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
		this.start = record.start - absoluteStart;
		this.end = record.end - absoluteStart;
		this.duration = this.end - this.start;
		this.self = this.duration;
		this.asyncEnd = this.end;
		this.asyncDuration = this.duration;
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
			this._createRootRecordViews();
		},

		_generate: function() {
			this._createElement();
			this._addStyleElement();

			this._elements.recordNamesBackground = this._element.querySelector(".jsp_wc_recordNamesBackground");
			this._elements.recordNames = this._element.querySelector(".jsp_wc_recordNames");
			this._elements.recordsBackground = this._element.querySelector(".jsp_wc_recordsBackground");
			this._elements.records = this._element.querySelector(".jsp_wc_records");
			
			if (dev) {
				this._elements.recordNamesBackground.innerHTML = "";
				this._elements.recordNames.innerHTML = "";
				this._elements.recordsBackground.innerHTML = "";
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

				if (childWcRecord.end <= wcRecord.end) {
					// Synchronous child
					wcRecord.self -= childWcRecord.duration;
				} else if (childWcRecord.start >= wcRecord.start) {
					// Asynchronous child
					wcRecord.duration += childWcRecord.duration;
					if (childWcRecord.asyncEnd > wcRecord.asyncEnd) {
						wcRecord.asyncEnd = childWcRecord.asyncEnd;
						wcRecord.asyncDuration = wcRecord.asyncEnd - wcRecord.start;
					}
				} else {
					console.warn("Child record has unmatched times");
				}
			}

			return wcRecord;
		},
		
		_createRootRecordViews: function () {
			var wcRecord, wcRecordView;
			
			if (!this._shown) {
				return;
			}

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
			var wcRecordView;

			wcRecordView = new WCRecordView(wcRecord);
			wcRecordView.delegate = this;

			wcRecordView.setStartPosition(utils.percentWithDecimalPlaces(wcRecord.start / this._totalDuration, 4));
			wcRecordView.setAsyncDuration(utils.percentWithDecimalPlaces(wcRecord.asyncDuration / this._totalDuration, 4));
			wcRecordView.setDuration(utils.percentWithDecimalPlaces(wcRecord.duration / this._totalDuration, 4));
			wcRecordView.setSelfDuration(utils.percentWithDecimalPlaces(wcRecord.self / this._totalDuration, 4));

			this._addBackgroundRow();
			
			return wcRecordView;
		},
		
		_addBackgroundRow: function() {
			var div = document.createElement("div");
			div.className = "jsp_wc_row";
			this._elements.recordNamesBackground.appendChild(div.cloneNode(true));
			this._elements.recordsBackground.appendChild(div.cloneNode(true));
		},

		_removeBackgroundRow: function () {
			this._elements.recordNamesBackground.removeChild(this._elements.recordNamesBackground.lastChild);
			this._elements.recordsBackground.removeChild(this._elements.recordsBackground.lastChild);
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

				if (childWcRecord.folded === false) {
					this._unfoldRecordView(childWcRecordView);
				}

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

		setDuration: function (duration) {
			this.childRecordBar.style.width = duration;
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
			
			this.childRecordBar = document.createElement("div");
			this.childRecordBar.className = "jsp_wc_recordBar jsp_wc_childRecordBar";
			recordBarsContainer.appendChild(this.childRecordBar);
			
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
		}
	};
	
}());