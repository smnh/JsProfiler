WaterfallChart.WCRecordView = (function () {

	/**
	 * @name WaterfallChart.WCRecordView
	 * @param {Object} data
	 * @constructor
	 */
	function WCRecordView(data) {

		this.folded = data.folded;
		this.indexPath = null;
		this.parentWcRecordView = null;
		this.childWcRecordViews = [];
		this.delegate = null;
		
		this._generateRecordNameElement(data.name);
		this._generateRecordElement(data.hasChildren, data.hasAsyncDescendants);
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
			childRecordBar.className = "jspwc_recordBar jspwc_childRecordBar";
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
			recordNameElement.className = "jspwc_row";
			recordNameElement.appendChild(document.createTextNode(recordName));

			this.recordNameContainerElm = document.createElement("div");
			this.recordNameContainerElm.className = "jspwc_recordNameContainer";
			this.recordNameContainerElm.appendChild(recordNameElement);
		},

		_generateRecordElement: function (hasChildren, hasAsyncDescendants) {
			var containmentTools, recordBracket, recordBarsContainer;

			this.recordElm = document.createElement("div");
			this.recordElm.className = "jspwc_record";

			if (hasChildren) {
				containmentTools = document.createElement("div");
				containmentTools.className = "jspwc_containmentTools";

				recordBracket = document.createElement("div");
				recordBracket.className = "jspwc_recordBracket";
				containmentTools.appendChild(recordBracket);

				this.foldHandleElm = document.createElement("div");
				this.foldHandleElm.className = this.folded ? "jspwc_foldHandleFolded" : "jspwc_foldHandleUnfolded";
				this.foldHandleElm.addEventListener("click", this, false);
				containmentTools.appendChild(this.foldHandleElm);

				this.recordElm.appendChild(containmentTools);
			} else {
				this.foldHandleElm = null;
			}

			recordBarsContainer = document.createElement("div");
			recordBarsContainer.className = "jspwc_recordBarsContainer";

			if (hasAsyncDescendants) {
				this.asyncRecordBarElm = document.createElement("div");
				this.asyncRecordBarElm.className = "jspwc_recordBar jspwc_asyncRecordBar";
				recordBarsContainer.appendChild(this.asyncRecordBarElm);
			} else {
				this.asyncRecordBarElm = null;
			}

			this.selfRecordBarElm = document.createElement("div");
			this.selfRecordBarElm.className = "jspwc_recordBar jspwc_selfRecordBar";
			recordBarsContainer.appendChild(this.selfRecordBarElm);

			this.recordElm.appendChild(recordBarsContainer);

			this.recordContainerElm = document.createElement("div");
			this.recordContainerElm.className = "jspwc_recordContainer";
			this.recordContainerElm.appendChild(this.recordElm);
		},

		addChildWcRecordView: function (childWcRecordView) {
			childWcRecordView.parentWcRecordView = this;
			this.childWcRecordViews.push(childWcRecordView);
			this.recordContainerElm.appendChild(childWcRecordView.recordContainerElm);
			this.recordNameContainerElm.appendChild(childWcRecordView.recordNameContainerElm);
		},

		removeAllChildWcRecordView: function () {
			var childWcRecordView;

			while (this.childWcRecordViews.length) {
				childWcRecordView = this.childWcRecordViews.pop();
				childWcRecordView.parentWcRecordView = null;
				childWcRecordView.recordContainerElm.parentNode.removeChild(childWcRecordView.recordContainerElm);
				childWcRecordView.recordNameContainerElm.parentNode.removeChild(childWcRecordView.recordNameContainerElm);
			}
		},

		unfold: function() {
			this.folded = false;
			this.foldHandleElm.className = "jspwc_foldHandleUnfolded";
		},

		fold: function() {
			this.folded = true;
			this.foldHandleElm.className = "jspwc_foldHandleFolded";
		},

		_toggle: function() {
			// Invoke the delegate methods outside of the fold and unfold methods to prevent invoking delegate methods
			// when fold() and unfold() are called from outside.
			if (!this.folded) {
				this.fold();
				if (this.delegate && typeof this.delegate.wcRecordViewFolded === "function") {
					this.delegate.wcRecordViewFolded(this);
				}
			} else {
				this.unfold();
				if (this.delegate && typeof this.delegate.wcRecordViewUnfolded === "function") {
					this.delegate.wcRecordViewUnfolded(this);
				}
			}
		},

		handleEvent: function (event) {
			if (event.target === this.foldHandleElm) {
				this._toggle();
			}
		}
	};

	return WCRecordView;
}());