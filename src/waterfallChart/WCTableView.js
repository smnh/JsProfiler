WaterfallChart.WCTableView = (function(){
	
	var utils;
	
	/**
	 * @name WaterfallChart.WCTableView
	 * @param ancestorElement
	 * @constructor
	 */
	function WCTableView(ancestorElement) {

		this.dataSource = null;
		this.delegate = null;
		
		this._asyncRecords = true;
		this._element = ancestorElement.querySelector(".jspwc_table");
		
		this._cssRules = {};

		this._cssRules.leftColumn = WaterfallChart.utils.cssRuleForSelector(".jspwc_leftColumn");
		this._cssRules.rightColumn = WaterfallChart.utils.cssRuleForSelector(".jspwc_rightColumn");
		
		this._elements = {};
		
		this._elements.columnResizeHandle = this._element.querySelector(".jspwc_columnResizeHandle");
		
		this._elements.header = this._element.querySelector(".jspwc_header");
		this._elements.headerGridlinesContainer = this._elements.header.querySelector(".jspwc_headerGridlinesContainer");
		this._elements.moveHandle = this._elements.header.querySelector(".jspwc_moveHandle");
		this._elements.maximizeHandle = this._elements.header.querySelector(".jspwc_maximizeHandle");
		this._elements.closeHandle = this._elements.header.querySelector(".jspwc_closeHandle");
		this._elements.asyncRecordsHandle = this._elements.header.querySelector(".jspwc_asyncRecordsHandle");
		this._elements.cpuTimeOverview = this._elements.header.querySelector(".jspwc_cpuTimeOverview");
		
		this._elements.bodyOverlays = this._element.querySelector(".jspwc_bodyOverlays");
		this._elements.timeline = this._element.querySelector(".jspwc_timeline");
		this._elements.timelineGridlinesContainer = this._element.querySelector(".jspwc_timelineGridlinesContainer");
		this._elements.recordGridlinesContainer = this._element.querySelector(".jspwc_recordGridlinesContainer");
		this._elements.resizeHandle = this._element.querySelector(".jspwc_resizeHandle");
		this._elements.scrollView = this._element.querySelector(".jspwc_scrollView");
		this._elements.recordNamesBackground = this._element.querySelector(".jspwc_recordNamesBackground");
		this._elements.recordNames = this._element.querySelector(".jspwc_recordNames");
		this._elements.recordRowsBackground = this._element.querySelector(".jspwc_recordRowsBackground");
		this._elements.records = this._element.querySelector(".jspwc_records");

		this._elements.recordNamesBackground.innerHTML = "";
		this._elements.recordNames.innerHTML = "";
		this._elements.recordRowsBackground.innerHTML = "";
		this._elements.records.innerHTML = "";
		
		this._timelineOverview = new WaterfallChart.TimelineOverview(this._elements.header);
		this._timelineOverview.delegate = this;

		this._timelineOverviewStart = 0;
		this._timelineOverviewEnd = 100;
		this._timelineOverviewWidth = null;
		
		this._lastTimelineOverviewStart = this._timelineOverviewStart;
		this._lastTimelineOverviewEnd = this._timelineOverviewEnd;
		
		this._wcRecordViews = [];
		this._numberOfGridlines = 0;
		this._totalDuration = 0;
		this._maximized = false;
		this._minimizedDimensionAndPosition = null;
		
		this._eventState = "idle";
		this._startEventPagePosition = null;
		this._startEventSize = null;
		this._startEventPosition = null;
		this._startEventColumnResizeHandleLeft = null;
		this._startEventBodyOverlaysLeft = null;
		this._startEventLeftColumnWidth = null;
		this._startEventRightColumnMarginLeft = null;
		
		this._attachEvents();
	}
	
	WCTableView.prototype = {
		constructor: WCTableView,
		
		setTotalDuration: function(duration) {
			this._totalDuration = duration;
		},

		/**
		 * This method MUST be called after the elements have been added to DOM. 
		 */
		layoutElements: function () {
			var paddingRight = 5,
				bodyOverlaysWidth = this._elements.bodyOverlays.offsetWidth,
				timeLineWidth = this._elements.recordRowsBackground.offsetWidth,
				scrollBarWidth = bodyOverlaysWidth - timeLineWidth;
			
			// Overwrite table's position from using margins to left and top.
			this._element.style.left = this._element.offsetLeft + "px";
			this._element.style.top = this._element.offsetTop + "px";
			this._element.style.margin = "0";
			
			this._timelineOverview.setMarginRight(scrollBarWidth + paddingRight);
			this._timelineOverview.setLeftHandlePosition(this._timelineOverviewStart);
			this._timelineOverview.setRightHandlePosition(this._timelineOverviewEnd);

			this._elements.cpuTimeOverview.style.marginRight = (scrollBarWidth + paddingRight) + "px";
			
			this._elements.timeline.style.right = scrollBarWidth + "px";
			this._elements.headerGridlinesContainer.style.right = (scrollBarWidth + paddingRight) + "px";
			this._elements.recordGridlinesContainer.style.right = (scrollBarWidth + paddingRight) + "px";

			this._elements.resizeHandle.style.width = (scrollBarWidth - 2) + "px";
			this._elements.resizeHandle.style.height = (scrollBarWidth - 2) + "px";

			this._updateGridlines();
			this._updateRecords();
		},
		
		reloadData: function() {
			
			var numberOfRootRecords, wcRecordView, i, indexPath;

			this._elements.cpuTimeOverview.innerHTML = "";
			this._elements.recordNamesBackground.innerHTML = "";
			this._elements.recordNames.innerHTML = "";
			this._elements.recordRowsBackground.innerHTML = "";
			this._elements.records.innerHTML = "";

			this._wcRecordViews = [];
			
			if (!this.dataSource) {
				return;
			}
			
			if (typeof this.dataSource.numberOfChildWcRecordViewsForIndexPath === "function" && typeof this.dataSource.wcRecordViewForIndexPath === "function") {
				numberOfRootRecords = this.dataSource.numberOfChildWcRecordViewsForIndexPath(null, this._asyncRecords);
				for (i = 0; i < numberOfRootRecords; i++) {
					indexPath = [i];
					wcRecordView = this.dataSource.wcRecordViewForIndexPath(indexPath, this._asyncRecords);
					wcRecordView.indexPath = indexPath;
					wcRecordView.delegate = this;
					
					this._wcRecordViews.push(wcRecordView);
					this._elements.records.appendChild(wcRecordView.recordContainerElm);
					this._elements.recordNames.appendChild(wcRecordView.recordNameContainerElm);

					// While reloading data make sure that root wcRecordViews are within the chart's viewable area.
					// If they are add a background row, otherwise hide them.
					if (this._isWcRecordViewVisible(wcRecordView)) {
						this._addBackgroundRow();
					} else {
						wcRecordView.hide();
					}

					if (wcRecordView.folded === false) {
						this._unfoldWCRecordView(wcRecordView);
					}
				}
			}
			
			if (typeof this.dataSource.numberOfChildWcRecordViewsForIndexPath === "function") {
				// For CPU Time Overview always use async=false flag to show all stack level 0 records.
				numberOfRootRecords = this.dataSource.numberOfChildWcRecordViewsForIndexPath(null, false);
				for (i = 0; i < numberOfRootRecords; i++) {
					this._elements.cpuTimeOverview.appendChild(this.dataSource.cpuTimeOverviewRecordBarElementForIndex(i));
				}
			}
		},

		_unfoldWCRecordView: function (wcRecordView) {
			var numberOfChildWcRecordViews, childWcRecordView, i, indexPath;

			numberOfChildWcRecordViews = this.dataSource.numberOfChildWcRecordViewsForIndexPath(wcRecordView.indexPath, this._asyncRecords);

			for (i = 0; i < numberOfChildWcRecordViews; i++) {
				indexPath = wcRecordView.indexPath.concat(i);
				childWcRecordView = this.dataSource.wcRecordViewForIndexPath(indexPath, this._asyncRecords);
				childWcRecordView.indexPath = indexPath;
				childWcRecordView.delegate = this;

				wcRecordView.addChildWcRecordView(childWcRecordView);
				
				// While unfolding wcRecordView and creating child wcRecordViews make sure they are within the chart's
				// viewable area. If they are add a background row, otherwise hide them.
				if (this._isWcRecordViewVisible(childWcRecordView)) {
					this._addBackgroundRow();
				} else {
					childWcRecordView.hide();
				}

				if (childWcRecordView.folded === false) {
					this._unfoldWCRecordView(childWcRecordView);
				}
			}
		},
		
		_addBackgroundRow: function () {
			var div = document.createElement("div");
			div.className = "jspwc_row";
			this._elements.recordNamesBackground.appendChild(div.cloneNode(false));
			this._elements.recordRowsBackground.appendChild(div.cloneNode(false));
		},

		_foldWCRecordView: function (wcRecordView) {
			var numberOfChildWcRecordViews, i, childWcRecordView;

			numberOfChildWcRecordViews = wcRecordView.childWcRecordViews.length;
			
			for (i = 0; i < numberOfChildWcRecordViews; i++) {
				childWcRecordView = wcRecordView.childWcRecordViews[i];
				if (this._isWcRecordViewVisible(childWcRecordView)) {
					this._removeBackgroundRow();
				}
				if (wcRecordView.childWcRecordViews[i].folded === false) {
					this._foldWCRecordView(childWcRecordView);
				}
			}
			
			wcRecordView.removeAllChildWcRecordView();
		},

		_removeBackgroundRow: function () {
			this._elements.recordNamesBackground.removeChild(this._elements.recordNamesBackground.lastChild);
			this._elements.recordRowsBackground.removeChild(this._elements.recordRowsBackground.lastChild);
		},
		
		_isWcRecordViewVisible: function(wcRecordView) {
			return wcRecordView.start <= this._timelineOverviewEnd && wcRecordView.start + wcRecordView.asyncDuration >= this._timelineOverviewStart;
		},
		
		_attachEvents: function () {
			this._elements.resizeHandle.addEventListener("mousedown", this, false);
			this._elements.moveHandle.addEventListener("mousedown", this, false);
			this._elements.maximizeHandle.addEventListener("click", this, false);
			this._elements.closeHandle.addEventListener("click", this, false);
			this._elements.asyncRecordsHandle.addEventListener("click", this, false);
			if (this._cssRules.leftColumn && this._cssRules.rightColumn) {
				this._elements.columnResizeHandle.addEventListener("mousedown", this, false);
			} else {
				console.warn("Could not get css rules of waterfall chart columns.");
			}
		},

		_updateGridlines: function () {
			var numOfColumns, columnRatio, columnWidthPercent, columnLeft, numOfGridlines,
				timelineStart, timelineDuration,
				i, time, timeStr, reuseNumberOfGridlines,
				gridlineElm, gridlineLabelElm,
				minGridlineSpace = 60;

			this._timelineOverviewWidth = this._timelineOverview.getOffsetWidth();
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
					this._elements.headerGridlinesContainer.childNodes[i].style.left = columnLeft;
					this._elements.headerGridlinesContainer.childNodes[i].childNodes[0].childNodes[0].nodeValue = timeStr;
				}

				// Create new grid-line elements
				for (i; i < numOfGridlines; i++) {
					columnLeft = (columnWidthPercent * i) + "%";

					gridlineElm = document.createElement("div");
					gridlineElm.className = "jspwc_recordGridline";
					gridlineElm.style.left = columnLeft;
					this._elements.recordGridlinesContainer.appendChild(gridlineElm);

					time = this._totalDuration * i * columnRatio;
					timeStr = (time === 0 ? "0" : utils.timeString(time));
					gridlineLabelElm = document.createElement("div");
					gridlineLabelElm.className = "jspwc_gridlineLabel";
					gridlineLabelElm.appendChild(document.createTextNode(timeStr));

					gridlineElm = gridlineElm.cloneNode(false);
					gridlineElm.appendChild(gridlineLabelElm);
					this._elements.headerGridlinesContainer.appendChild(gridlineElm);

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
					this._elements.headerGridlinesContainer.removeChild(this._elements.headerGridlinesContainer.lastChild);
				}

				this._numberOfGridlines = numOfGridlines;
			}
		},

		_updateGridlineTimes: function () {
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
		},

		_updateRecords: function () {
			var widthMultiplier = 100 / (this._timelineOverviewEnd - this._timelineOverviewStart);
			
			this._elements.records.style.width = (100 * widthMultiplier) + "%";
			this._elements.records.style.left = (-1 * this._timelineOverviewStart * widthMultiplier) + "%";
			
			// Remove record rows outside of the chart view
			
			if (this._timelineOverviewStart > this._lastTimelineOverviewStart) {
				this._hideRecordsFromLeft(this._wcRecordViews);
			} else if (this._timelineOverviewStart < this._lastTimelineOverviewStart) {
				this._revealRecordsFromLeft(this._wcRecordViews);
			}
			
			if (this._timelineOverviewEnd < this._lastTimelineOverviewEnd) {
				this._hideRecordsFromRight(this._wcRecordViews);
			} else if (this._timelineOverviewEnd > this._lastTimelineOverviewEnd) {
				this._revealRecordsFromRight(this._wcRecordViews);
			}
			
			this._lastTimelineOverviewStart = this._timelineOverviewStart;
			this._lastTimelineOverviewEnd = this._timelineOverviewEnd;
		},
		
		_forEachWcRecordView: function(wcRecordViews, callback) {
			var i, wcRecordView, startTime, endTime;
			for (i = 0; i < wcRecordViews.length; i++) {
				wcRecordView = wcRecordViews[i];
				startTime = wcRecordView.start;
				endTime = startTime + wcRecordView.asyncDuration;
				callback.call(this, wcRecordView, startTime, endTime);
			}
		},
		
		_hideRecordsFromLeft: function(wcRecordViews) {
			this._forEachWcRecordView(wcRecordViews, function (wcRecordView, startTime, endTime) {
				// Check if wcRecordView children should be hidden only if chart's left edge has moved inside the wcRecordView.
				if (wcRecordView.childWcRecordViews.length > 0 && this._lastTimelineOverviewStart <= endTime && this._timelineOverviewStart > startTime) {
					this._hideRecordsFromLeft(wcRecordView.childWcRecordViews);
				}
				// Hide wcRecordView if chart's left edge has passed over wcRecordView's right edge. 
				if (this._lastTimelineOverviewStart <= endTime && this._timelineOverviewStart > endTime) {
					wcRecordView.hide();
					this._removeBackgroundRow();
				}
			});
		},
		
		_revealRecordsFromLeft: function (wcRecordViews) {
			this._forEachWcRecordView(wcRecordViews, function (wcRecordView, startTime, endTime) {
				// Check if wcRecordView children should be shown only if chart's left edge has moved inside the wcRecordView.
				if (wcRecordView.childWcRecordViews.length > 0 && this._lastTimelineOverviewStart > startTime && this._timelineOverviewStart <= endTime) {
					this._revealRecordsFromLeft(wcRecordView.childWcRecordViews);
				}
				// Show wcRecordView if chart's left edge has passed over wcRecordView's right edge. 
				if (this._lastTimelineOverviewStart > endTime && this._timelineOverviewStart <= endTime) {
					wcRecordView.show();
					this._addBackgroundRow();
				}
			});
		},
		
		_hideRecordsFromRight: function(wcRecordViews) {
			this._forEachWcRecordView(wcRecordViews, function (wcRecordView, startTime, endTime) {
				// Check if wcRecordView children should be hidden only if chart's right edge has moved inside the wcRecordView.
				if (wcRecordView.childWcRecordViews.length > 0 && this._lastTimelineOverviewEnd >= startTime && this._timelineOverviewEnd < endTime) {
					this._hideRecordsFromRight(wcRecordView.childWcRecordViews);
				}
				// Hide wcRecordView if chart's right edge has passed over wcRecordView's left edge. 
				if (this._lastTimelineOverviewEnd >= startTime && this._timelineOverviewEnd < startTime) {
					wcRecordView.hide();
					this._removeBackgroundRow();
				}
			});
		},

		_revealRecordsFromRight: function(wcRecordViews) {
			this._forEachWcRecordView(wcRecordViews, function (wcRecordView, startTime, endTime) {
				// Check if wcRecordView children should be shown only if chart's right edge has moved inside the wcRecordView.
				if (wcRecordView.childWcRecordViews.length > 0 && this._lastTimelineOverviewEnd < endTime && this._timelineOverviewEnd >= startTime) {
					this._revealRecordsFromRight(wcRecordView.childWcRecordViews);
				}
				// Show wcRecordView if chart's right edge has passed over wcRecordView's left edge. 
				if (this._lastTimelineOverviewEnd < startTime && this._timelineOverviewEnd >= startTime) {
					wcRecordView.show();
					this._addBackgroundRow();
				}
			});
		},

		_toggleAsyncRecords: function () {
			if (this._asyncRecords) {
				this._elements.asyncRecordsHandle.className = this._elements.asyncRecordsHandle.className.replace("jspwc_asyncRecordsHandle", "jspwc_nonAsyncRecordsHandle");
			} else {
				this._elements.asyncRecordsHandle.className = this._elements.asyncRecordsHandle.className.replace("jspwc_nonAsyncRecordsHandle", "jspwc_asyncRecordsHandle");
			}
			this._asyncRecords = !this._asyncRecords;
			this.reloadData();
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

					if (event.target === this._elements.resizeHandle) {
						this._eventState = "resizeHandleGrabbed";
						this._startEventSize = {
							width: this._element.clientWidth,
							height: this._elements.scrollView.offsetHeight
						};
					} else if (event.target === this._elements.moveHandle) {
						this._eventState = "moveHandleGrabbed";
						this._startEventPosition = {
							x: this._element.offsetLeft,
							y: this._element.offsetTop
						};
					} else if (event.target === this._elements.columnResizeHandle) {
						this._eventState = "columnResizeHandleGrabbed";
						this._startEventColumnResizeHandleLeft = this._elements.columnResizeHandle.offsetLeft;
						this._startEventBodyOverlaysLeft = this._elements.bodyOverlays.offsetLeft;
						this._startEventLeftColumnWidth = parseInt(this._cssRules.leftColumn.style.width, 10);
						this._startEventRightColumnMarginLeft = parseInt(this._cssRules.rightColumn.style.marginLeft, 10);
					}
				},
				click: function(event) {
					var margin = 11;
					if (event.target === this._elements.maximizeHandle) {
						if (!this._maximized) {
							this._minimizedDimensionAndPosition = {
								x: this._element.offsetLeft,
								y: this._element.offsetTop,
								width: this._element.clientWidth,
								height: this._elements.scrollView.offsetHeight
							};
							this._element.style.left = 10 + "px";
							this._element.style.top = 10 + "px";
							this._element.style.width = (this._element.offsetParent.offsetWidth - margin * 2) + "px";
							this._elements.scrollView.style.height = (this._element.offsetParent.offsetHeight - margin * 2 - this._elements.header.offsetHeight) + "px";
							this._updateGridlines();
							this._elements.maximizeHandle.className = this._elements.maximizeHandle.className.replace("jspwc_maximizeHandle", "jspwc_minimizeHandle");
						} else {
							this._element.style.left = this._minimizedDimensionAndPosition.x + "px";
							this._element.style.top = this._minimizedDimensionAndPosition.y + "px";
							this._element.style.width = this._minimizedDimensionAndPosition.width + "px";
							this._elements.scrollView.style.height = this._minimizedDimensionAndPosition.height + "px";
							this._updateGridlines();
							this._elements.maximizeHandle.className = this._elements.maximizeHandle.className.replace("jspwc_minimizeHandle", "jspwc_maximizeHandle");
						}
						this._maximized = !this._maximized;
					} else if (event.target === this._elements.closeHandle) {
						if (this.delegate && typeof this.delegate.wcTableViewDidClickClose === "function") {
							this.delegate.wcTableViewDidClickClose();
						}
					} else if (event.target === this._elements.asyncRecordsHandle) {
						this._toggleAsyncRecords();
					}
				}
			},
			resizeHandleGrabbed: {
				move: function () {
					this._maximized = false;
					this._element.style.width = (this._startEventSize.width + (event.pageX - this._startEventPagePosition.x)) + "px";
					this._elements.scrollView.style.height = (this._startEventSize.height + (event.pageY - this._startEventPagePosition.y)) + "px";
					this._updateGridlines();
				},
				end: function () {
					this._removeDraggingEventsAndReturnToIdleState();
				}
			},
			moveHandleGrabbed: {
				move: function () {
					this._maximized = false;
					this._element.style.left = (this._startEventPosition.x + (event.pageX - this._startEventPagePosition.x)) + "px";
					this._element.style.top = (this._startEventPosition.y + (event.pageY - this._startEventPagePosition.y)) + "px";
				},
				end: function () {
					this._removeDraggingEventsAndReturnToIdleState();
				}
			},
			columnResizeHandleGrabbed: {
				move: function () {
					this._elements.columnResizeHandle.style.left = (this._startEventColumnResizeHandleLeft + (event.pageX - this._startEventPagePosition.x)) + "px";
					this._elements.bodyOverlays.style.left = (this._startEventBodyOverlaysLeft + (event.pageX - this._startEventPagePosition.x)) + "px";
					this._cssRules.leftColumn.style.width = this._startEventLeftColumnWidth + (event.pageX - this._startEventPagePosition.x) + "px";
					this._cssRules.rightColumn.style.marginLeft = this._startEventRightColumnMarginLeft + (event.pageX - this._startEventPagePosition.x) + "px";
					this._updateGridlines();
				},
				end: function () {
					this._removeDraggingEventsAndReturnToIdleState();
				}
			}
		},
		
		_removeDraggingEventsAndReturnToIdleState: function() {
			document.removeEventListener("mousemove", this, false);
			document.removeEventListener("mouseup", this, false);
			this._eventState = "idle";
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
				case "click":
					eventHandlerName = "click";
					break;
			}
			this._eventStates[this._eventState][eventHandlerName].call(this, event);
		},

		/*
		 * TimelineOverview delegate methods
		 * -------------------------
		 */

		/**
		 * @param {WaterfallChart.TimelineOverview} timeline
		 */
		timelineDidChangedHandlesPosition: function (timeline) {
			this._timelineOverviewStart = timeline.getLeftHandlePosition();
			this._timelineOverviewEnd = timeline.getRightHandlePosition();
			this._updateGridlineTimes();
			this._updateRecords();
		},


		/* 
		 * WaterfallChart.WCRecordView delegate methods
		 * --------------------------------------------
		 */

		/**
		 * @param {WaterfallChart.WCRecordView} wcRecordView
		 */
		wcRecordViewFolded: function (wcRecordView) {
			this._foldWCRecordView(wcRecordView);
			if (this.delegate && typeof this.delegate.wcTableViewDidFoldedWcRecordViewAtIndexPath === "function") {
				this.delegate.wcTableViewDidFoldedWcRecordViewAtIndexPath(wcRecordView.indexPath, this._asyncRecords);
			}
		},

		/**
		 * @param {WaterfallChart.WCRecordView} wcRecordView
		 */
		wcRecordViewUnfolded: function (wcRecordView) {
			this._unfoldWCRecordView(wcRecordView);
			if (this.delegate && typeof this.delegate.wcTableViewDidUnfoldedWcRecordViewAtIndexPath === "function") {
				this.delegate.wcTableViewDidUnfoldedWcRecordViewAtIndexPath(wcRecordView.indexPath, this._asyncRecords);
			}
		}
	};

	utils = {
		timeString: function (timeMs) {
			var timeStr;
			if (timeMs >= 1000) {
				timeStr = Math.round(timeMs / 10) / 100 + " s";
			} else {
				timeStr = Math.round(timeMs) + " ms";
			}
			return timeStr;
		}
	};
	
	return WCTableView;
	
}());