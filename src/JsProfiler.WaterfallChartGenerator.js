(function () {

	var styleElement = null,
		dev = true;

	function WaterfallChart() {
		this._recordsArray = null;
		this._shown = dev;
		this._finalTime = 0;
		this._element = null;
		this._elements = {};
		this._generate();
	}
	
	this.WaterfallChart = WaterfallChart;
	
	WaterfallChart.prototype = {
		constructor: WaterfallChart,
		
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
		
		setResults: function (rootRecord) {
			var i, finalTime = 0, record, wcRecord;
			
			this._recordsArray = [];
			
			for (i = 0; i < rootRecord.children.length; i++) {
				record = rootRecord.children[i];
				wcRecord = this._processRecord(record);
				this._recordsArray.push(wcRecord);
				if (wcRecord.asyncEnd > finalTime) {
					finalTime = wcRecord.asyncEnd;
				}
			}
			
			this._finalTime = finalTime;
			
			this._update();
		},
		
		_processRecord: function (record) {
			var i, wcRecord, childWcRecord;

			wcRecord = new WaterfallChart.WCRecord(record);

			for (i = 0; i < record.children.length; i++) {
				childWcRecord = this._processRecord(record.children[i]);
				wcRecord.children.push(childWcRecord);

				if (childWcRecord.end <= record.end) {
					// Synchronous child
					wcRecord.self -= childWcRecord.duration;
				} else if (childWcRecord.start >= record.start) {
					// Asynchronous child
					if (childWcRecord.asyncEnd > wcRecord.asyncEnd) {
						wcRecord.asyncEnd = childWcRecord.end;
						wcRecord.asyncDuration = wcRecord.asyncEnd - wcRecord.start;
					}
				} else {
					console.warn("Child record has unmatched times");
				}
			}

			return wcRecord;
		},
		
		_update: function () {
			var wcRecordView;
			
			if (!this._shown) {
				return;
			}

			this._elements.recordNames.innerHTML = "";
			this._elements.records.innerHTML = "";

			for (var i = 0; i < this._recordsArray.length; i++) {
				wcRecordView = new WaterfallChart.WCRecordView(this._recordsArray[i]);
				wcRecordView.delegate = this;

				this._elements.records.appendChild(wcRecordView.recordContainerElm);
				this._elements.recordNames.appendChild(wcRecordView.recordNameContainerElm);

				this._addBackgroundRows();
			}
		},

		wcRecordViewUnfolded: function(wcRecordView) {
			var wcRecord = wcRecordView.wcRecord;
			wcRecord.folded = false;
			this._unfoldRecordView(wcRecordView);
		},
		
		_unfoldRecordView: function(wcRecordView) {
			var i, childWcRecordView, childWcRecord,
				wcRecord = wcRecordView.wcRecord;
			
			for (i = 0; i < wcRecord.children.length; i++) {
				childWcRecord = wcRecord.children[i];
				childWcRecordView = new WaterfallChart.WCRecordView(childWcRecord);
				childWcRecordView.delegate = this;
				if (childWcRecord.folded === false) {
					this._unfoldRecordView(childWcRecordView);
				}
				wcRecordView.addChildWcRecordView(childWcRecordView);
				this._addBackgroundRows();
			}
		},
		
		_addBackgroundRows: function () {
			var div = document.createElement("div");
			div.className = "jsp_wc_row";
			this._elements.recordNamesBackground.appendChild(div.cloneNode(true));
			this._elements.recordsBackground.appendChild(div.cloneNode(true));
		},

		wcRecordViewFolded: function (wcRecordView) {
			var wcRecord = wcRecordView.wcRecord;
			wcRecord.folded = true;
			this._foldRecord(wcRecord);
		},
		
		_foldRecord: function(wcRecord) {
			var i;
			
			for (i = 0; i < wcRecord.children.length; i++) {
				this._removeBackgroundRows();
				if (wcRecord.children[i].folded === false) {
					this._foldRecord(wcRecord.children[i]);
				}
			}
		},
		
		_removeBackgroundRows: function () {
			this._elements.recordNamesBackground.removeChild(this._elements.recordNamesBackground.lastChild);
			this._elements.recordsBackground.removeChild(this._elements.recordsBackground.lastChild);
		},
		
		show: function () {
			this._shown = true;
		}
	};

	/**
	 *
	 * @param {JsProfiler.Record} record
	 * @constructor
	 */
	WaterfallChart.WCRecord = function WCRecord(record) {
		this.name = record.name;
		this.start = record.start;
		this.end = record.end;
		this.duration = this.end - this.start;
		this.self = this.duration;
		this.asyncEnd = this.end;
		this.asyncDuration = this.duration;
		this.children = [];
		this.folded = true;
	};

	/**
	 *
	 * @param {WaterfallChart.WCRecord} wcRecord
	 * @constructor
	 */
	WaterfallChart.WCRecordView = function WCRecordView(wcRecord) {
		
		var hasChildren = wcRecord.children.length > 0,
			isAsync = wcRecord.asyncDuration > wcRecord.duration;
		
		this.wcRecord = wcRecord;
		this.folded = true;
		this.childWcRecordViews = [];
		this.delegate = null;
		
		this._generateRecordNameElement(wcRecord.name);
		this._generateRecordElement(hasChildren, isAsync);
	};

	WaterfallChart.WCRecordView.prototype = {
		
		constructor: WaterfallChart.WCRecordView,
		
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
			var recordBracket, asyncRecordBar, selfRecordBar;
			
			this.recordContainerElm = document.createElement("div");
			this.recordContainerElm.className = "jsp_wc_recordContainer";

			if (hasChildren) {
				recordBracket = document.createElement("div");
				recordBracket.className = "jsp_wc_recordBracket";
				this.recordContainerElm.appendChild(recordBracket);

				this.foldHandleElm = document.createElement("div");
				this.foldHandleElm.className = "jsp_wc_foldHandleFolded";
				this.foldHandleElm.addEventListener("click", this, false);
				this.recordContainerElm.appendChild(this.foldHandleElm);
			} else {
				this.foldHandleElm = null;
			}

			if (isAsync) {
				asyncRecordBar = document.createElement("div");
				asyncRecordBar.className = "jsp_wc_recordBar jsp_wc_asyncRecordBar";
				this.recordContainerElm.appendChild(asyncRecordBar);
			}

			selfRecordBar = document.createElement("div");
			selfRecordBar.className = "jsp_wc_recordBar jsp_wc_selfRecordBar";
			this.recordContainerElm.appendChild(selfRecordBar);
		},
		
		setStartPosition: function(start) {
			this.recordNameContainerElm.style.marginLeft = left;
		},
		
		setDuration: function(duration) {
			
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
	
}).apply(JsProfiler);