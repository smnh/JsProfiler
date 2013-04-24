WaterfallChart.TimelineOverview = (function(){
	
	/**
	 * @name WaterfallChart.TimelineOverview
	 * @param ancestorElement
	 * @constructor
	 */
	function TimelineOverview(ancestorElement) {
		this._element = ancestorElement.querySelector(".jspwc_timelineOverview");

		this._elements = {};
		this._elements.moveHandle = this._element.querySelector(".jspwc_timelineOverviewMoveHandle");
		this._elements.leftShadowOverlay = this._element.querySelector(".jspwc_timelineOverviewLeftShadowOverlay");
		this._elements.rightShadowOverlay = this._element.querySelector(".jspwc_timelineOverviewRightShadowOverlay");
		this._elements.leftHandle = this._elements.leftShadowOverlay.querySelector(".jspwc_timelineOverviewHandle");
		this._elements.rightHandle = this._elements.rightShadowOverlay.querySelector(".jspwc_timelineOverviewHandle");

		this.gridlinesContainer = this._element.querySelector(".jspwc_timelineOverviewGridlinesContainer");
		this.delegate = null;

		this._leftHandlePosition = null;
		this._rightHandlePosition = null;

		this._eventState = "idle";
		this._startEventWidth = null;
		this._startEventPagePosition = null;
		this._startEventLeftHandlePosition = null;
		this._startEventRightHandlePosition = null;
		this._attachEvents();
	}

	TimelineOverview.prototype = {
		constructor: TimelineOverview,

		setMarginRight: function (marginRight) {
			this._element.style.marginRight = marginRight + "px";
			this._elements.rightShadowOverlay.style.right = -marginRight + "px";
		},

		getOffsetWidth: function () {
			return this._element.offsetWidth;
		},

		getLeftHandlePosition: function () {
			return this._leftHandlePosition;
		},

		setLeftHandlePosition: function (leftHandlePosition) {
			this._leftHandlePosition = leftHandlePosition;
			this._elements.leftShadowOverlay.style.right = (100 - leftHandlePosition) + "%";
			this._elements.moveHandle.style.left = leftHandlePosition + "%";
		},

		getRightHandlePosition: function () {
			return this._rightHandlePosition;
		},

		setRightHandlePosition: function (rightHandlePosition) {
			this._rightHandlePosition = rightHandlePosition;
			this._elements.rightShadowOverlay.style.left = rightHandlePosition + "%";
			this._elements.moveHandle.style.right = (100 - rightHandlePosition) + "%";
		},

		_attachEvents: function () {
			this._elements.moveHandle.addEventListener("mousedown", this, false);
			this._elements.leftHandle.addEventListener("mousedown", this, false);
			this._elements.rightHandle.addEventListener("mousedown", this, false);
		},

		_notifyDelegate: function () {
			if (this.delegate && typeof this.delegate.timelineDidChangedHandlesPosition === "function") {
				this.delegate.timelineDidChangedHandlesPosition(this);
			}
		},

		handleEvent: function (event) {
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

		_eventStates: {
			idle: {
				start: function (event) {
					event.preventDefault(); // Prevent text selection

					document.addEventListener("mousemove", this, false);
					document.addEventListener("mouseup", this, false);

					this._startEventPagePosition = {
						x: event.pageX,
						y: event.pageY
					};

					this._startEventWidth = this.getOffsetWidth();

					if (event.target === this._elements.leftHandle) {
						this._eventState = "timelineOverviewLeftHandleGrabbed";
						this._startEventLeftHandlePosition = this._leftHandlePosition;
					} else if (event.target === this._elements.rightHandle) {
						this._eventState = "timelineOverviewRightHandleGrabbed";
						this._startEventRightHandlePosition = this._rightHandlePosition;
					} else if (event.target === this._elements.moveHandle) {
						this._eventState = "timelineOverviewMoveHandleGrabbed";
						this._startEventLeftHandlePosition = this._leftHandlePosition;
						this._startEventRightHandlePosition = this._rightHandlePosition;
					}
				}
			},
			timelineOverviewLeftHandleGrabbed: {
				move: function () {
					var leftHandlePosition = this._startEventLeftHandlePosition + 100 * (event.pageX - this._startEventPagePosition.x) / this._startEventWidth;

					if (leftHandlePosition + 5 * 100 / this._startEventWidth > this._rightHandlePosition) {
						leftHandlePosition = this._rightHandlePosition - 5 * 100 / this._startEventWidth;
					} else if (leftHandlePosition < 0) {
						leftHandlePosition = 0;
					}

					this.setLeftHandlePosition(leftHandlePosition);
					this._notifyDelegate();
				},
				end: function () {
					document.removeEventListener("mousemove", this, false);
					document.removeEventListener("mouseup", this, false);
					this._eventState = "idle";
				}
			},
			timelineOverviewRightHandleGrabbed: {
				move: function () {
					var rightHandlePosition = this._startEventRightHandlePosition + 100 * (event.pageX - this._startEventPagePosition.x) / this._startEventWidth;

					if (rightHandlePosition - 5 * 100 / this._startEventWidth < this._leftHandlePosition) {
						rightHandlePosition = this._leftHandlePosition + 5 * 100 / this._startEventWidth;
					} else if (rightHandlePosition > 100) {
						rightHandlePosition = 100;
					}

					this.setRightHandlePosition(rightHandlePosition);
					this._notifyDelegate();
				},
				end: function () {
					document.removeEventListener("mousemove", this, false);
					document.removeEventListener("mouseup", this, false);
					this._eventState = "idle";
				}
			},
			timelineOverviewMoveHandleGrabbed: {
				move: function () {
					var leftHandlePosition = this._startEventLeftHandlePosition + 100 * (event.pageX - this._startEventPagePosition.x) / this._startEventWidth,
						rightHandlePosition = this._startEventRightHandlePosition + 100 * (event.pageX - this._startEventPagePosition.x) / this._startEventWidth;

					if (leftHandlePosition < 0) {
						rightHandlePosition += -leftHandlePosition;
						leftHandlePosition = 0;
					} else if (rightHandlePosition > 100) {
						leftHandlePosition -= rightHandlePosition - 100;
						rightHandlePosition = 100;
					}

					this.setLeftHandlePosition(leftHandlePosition);
					this.setRightHandlePosition(rightHandlePosition);
					this._notifyDelegate();
				},
				end: function () {
					document.removeEventListener("mousemove", this, false);
					document.removeEventListener("mouseup", this, false);
					this._eventState = "idle";
				}
			}
		}
	};
	
	return TimelineOverview;
}());
