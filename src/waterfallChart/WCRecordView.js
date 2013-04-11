WaterfallChart.WCRecordView = (function () {

	/**
	 * @name WaterfallChart.WCRecordView
	 * @param {WaterfallChart.WCRecordModel} wcRecord
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
		
		constructor: WCRecordView,

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

		addChildRecordBar: function (start, duration) {
			var childRecordBar = document.createElement("div");
			childRecordBar.className = "jsp_wc_recordBar jsp_wc_childRecordBar";
			childRecordBar.style.left = start;
			childRecordBar.style.width = duration;
			this.selfRecordBarElm.parentNode.insertBefore(childRecordBar, this.selfRecordBarElm);
		},

		setSelfDuration: function (selfDuration) {
			this.selfRecordBarElm.style.width = selfDuration;
		},

		_generateRecordNameElement: function (recordName) {
			var recordNameElement;

			recordNameElement = document.createElement("div");
			recordNameElement.className = "jsp_wc_row";
			recordNameElement.appendChild(document.createTextNode(recordName));

			this.recordNameContainerElm = document.createElement("div");
			this.recordNameContainerElm.className = "jsp_wc_recordNameContainer";
			this.recordNameContainerElm.appendChild(recordNameElement);
		},

		_generateRecordElement: function (hasChildren, isAsync) {
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

		addChildWcRecordView: function (childWcRecordView) {
			this.childWcRecordViews.push(childWcRecordView);
			this.recordContainerElm.appendChild(childWcRecordView.recordContainerElm);
			this.recordNameContainerElm.appendChild(childWcRecordView.recordNameContainerElm);
		},

		removeAllChildWcRecordView: function () {
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

		handleEvent: function (event) {
			if (event.target === this.foldHandleElm) {
				this.toggle();
			}
		}
	};

	return WCRecordView;
}());