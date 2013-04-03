(function() {

	var utils,
		testEl = document.createElement('div'),
		trimRegExp = /^\s+|\s+$/g;
	
	/**
	 * @namespace HtmlTableGenerator shows JsProfiler results in a dialog.
	 *
	 * @example
	 * var results = jsProfilerInstance.getResults();
	 * JsProfiler.HtmlTableGenerator.showTable(results);
	 */
	this.HtmlTableGenerator = {
		
		styleElement: null,
		tableContainerElement: null,
		tableElm: null,
		regularTableHeadElement: null,
		waterfallTableHeadElement: null,
		currentTableHeadElement: null,
		treeTableBodyElement: null,
		plainTableBodyElement: null,
		waterfallContainerElement: null,
		currentTableBodyElement: null,
		currentType: null,
		dropDownButtonLabelElm: null,
		footerGroupElm: null,

		/**
		 * Event handler that toggles children of a record in a waterfall table.
		 */
		toggleWaterfallChildren: function() {
			var dataCellElm;
			
			// Find ancestor element with "waterfallDataCell" class
			dataCellElm = this.parentNode;
			while (!utils.hasClass(dataCellElm, "waterfallDataCell")) {
				dataCellElm = dataCellElm.parentNode;
			}
			
			// Fold or unfold children based on the "data-unfolded" attribute
			if (dataCellElm.hasAttribute("data-unfolded")) {
				dataCellElm.removeAttribute("data-unfolded");
				utils.removeClass(dataCellElm, "unfolded");
				utils.addClass(dataCellElm._childDataCellsContainerElm, "hidden");
				utils.addClass(dataCellElm._labelCellElm._childLabelCellsContainerElm, "hidden");
			} else {
				dataCellElm.setAttribute("data-unfolded", "true");
				utils.addClass(dataCellElm, "unfolded");
				utils.removeClass(dataCellElm._childDataCellsContainerElm, "hidden");
				utils.removeClass(dataCellElm._labelCellElm._childLabelCellsContainerElm, "hidden");
			}
		},
		insertWaterfallRows: function(data, parentStartTime) {
			var i, record,
				labelCellElm, labelElm, childLabelCellsContainerElm,
				dataCellElm, dataCellBorderFrameElm, timeRectElm, unfoldElm, timeRectText, childDataCellsContainerElm,
				labelCellsFragment, dataCellsFragment, childrenResult;

			labelCellsFragment = document.createDocumentFragment();
			dataCellsFragment = document.createDocumentFragment();

			for (i = 0; i < data.length; i++) {
				record = data[i];

				// Create label cell
				labelCellElm = document.createElement("div");
				labelCellElm.className = "waterfallLabelCell";

				labelElm = document.createElement("div");
				labelElm.className = "waterfallLabelCellText";
				labelElm.appendChild(document.createTextNode(record.name));

				labelCellElm.appendChild(labelElm);

				// Create data cell
				dataCellElm = document.createElement("div");
				dataCellElm.className = "waterfallDataCell";
				dataCellElm._labelCellElm = labelCellElm;
				dataCellElm.style.marginLeft = (record.start - parentStartTime) + "px";

				dataCellBorderFrameElm = document.createElement("div");
				dataCellBorderFrameElm.className = "borderFrame";
				dataCellBorderFrameElm.style.width = (record.end - record.start) + "px";
				dataCellElm.appendChild(dataCellBorderFrameElm);

				timeRectElm = document.createElement("div");
				timeRectElm.className = "timeRect";
				timeRectElm.style.width = (record.end - record.start) + "px";

				if (record.children.length !== 0) {
					unfoldElm = document.createElement("span");
					unfoldElm.className = "foldHandleElm";
					unfoldElm.addEventListener("click", this.toggleWaterfallChildren, false);
					timeRectElm.appendChild(unfoldElm);
				}

				timeRectText = document.createElement("div");
				timeRectText.className = "timeRectText";
				timeRectText.appendChild(document.createTextNode((record.end - record.start) + "ms"));
				timeRectElm.appendChild(timeRectText);

				dataCellElm.appendChild(timeRectElm);

				if (record.children.length !== 0) {
					childLabelCellsContainerElm = document.createElement("div");
					utils.addClass(childLabelCellsContainerElm, "hidden childWaterfallLabelCellsContainer");
					labelCellElm.appendChild(childLabelCellsContainerElm);
					labelCellElm._childLabelCellsContainerElm = childLabelCellsContainerElm;

					childDataCellsContainerElm = document.createElement("div");
					childDataCellsContainerElm.style.width = (record.end - record.start) + "px";
					utils.addClass(childDataCellsContainerElm, "hidden childWaterfallDataCellsContainer");
					dataCellElm.appendChild(childDataCellsContainerElm);
					dataCellElm._childDataCellsContainerElm = childDataCellsContainerElm;

					childrenResult = this.insertWaterfallRows(record.children, record.start);
					childLabelCellsContainerElm.appendChild(childrenResult.labelCellsFragment);
					childDataCellsContainerElm.appendChild(childrenResult.dataCellsFragment);
				}

				labelCellsFragment.appendChild(labelCellElm);
				dataCellsFragment.appendChild(dataCellElm);
			}

			return {
				labelCellsFragment: labelCellsFragment,
				dataCellsFragment: dataCellsFragment
			};
		},
		generateWaterfallTableBody: function(data) {
			var tableBodyElm, rowElm, labelTdElm, dataTdElm, dataContainerElm, childrenResult;

			childrenResult = this.insertWaterfallRows(data, data.length ? data[0].start : 0);

			rowElm = document.createElement("tr");

			labelTdElm = document.createElement("td");
			labelTdElm.appendChild(childrenResult.labelCellsFragment);
			rowElm.appendChild(labelTdElm);

			dataContainerElm = document.createElement("div");
			dataContainerElm.className = "waterfallDataContainer";
			dataContainerElm.appendChild(childrenResult.dataCellsFragment);
			
			dataTdElm = document.createElement("td");
			dataTdElm.setAttribute("colspan", "5");
			dataTdElm.appendChild(dataContainerElm);
			rowElm.appendChild(dataTdElm);

			tableBodyElm = document.createElement("tbody");
			tableBodyElm.className = "waterfall";
			tableBodyElm.appendChild(rowElm);
			
			return tableBodyElm;
		},
		
		/**
		 * Generates tree data for the tree table:
		 * data = {
		 *     "record1": {
		 *         count: 5,
		 *         total: 30,
		 *         totalAverage: 6,
		 *         self: 5,
		 *         selfAverage: 1,
		 *         children: {
		 *             "record2": {
		 *                 ...
		 *             }, ...
		 *         }
		 *     },
		 *     "record3": {
		 *         ...
		 *     }, ...
		 * }
		 *
		 * @param {Array} results
		 * @returns {Object}
		 */
		generateTreeData: function(results) {
			
			var rootData = {};

			function processRecord(results, data) {
				var i, resultRecord, dataRecord, recordLabel;
				
				for (i = 0; i < results.length; i++) {
					resultRecord = results[i];
					
					if (resultRecord.async) {
						data = rootData;
					} // No need to check for non asynchronous children, because all child records after the first asynchronous child record must be asynchronous.
					
					recordLabel = resultRecord.name;
					if (!data.hasOwnProperty(recordLabel)) {
						data[recordLabel] = {
							count: 0,
							total: 0,
							totalAverage: 0,
							self: 0,
							selfAverage: 0,
							hasChildren: false,
							children: {}
						}
					}
					dataRecord = data[recordLabel];
					dataRecord.count += 1;
					dataRecord.total += resultRecord.total;
					dataRecord.totalAverage = Math.round((dataRecord.totalAverage * (dataRecord.count - 1) + resultRecord.total) / dataRecord.count);
					dataRecord.self += resultRecord.self;
					dataRecord.selfAverage = Math.round((dataRecord.selfAverage * (dataRecord.count - 1) + resultRecord.self) / dataRecord.count);
					if (!dataRecord.hasChildren && resultRecord.children.length) {
						dataRecord.hasChildren = true;
					}
					processRecord(resultRecord.children, dataRecord.children);
				}
			}
			
			processRecord(results, rootData);
			
			return rootData;
		},
		/**
		 * Event handler that toggles children of a record in a tree table.
		 */
		toggleTreeChildren: function() {
			var rowElm, depth, fold, unfoldedLevel, currDepth;

			rowElm = this.parentNode;
			while (!rowElm.hasAttribute("data-depth")) {
				rowElm = rowElm.parentNode;
			}
			depth = Number(rowElm.getAttribute("data-depth"));
			unfoldedLevel = depth + 1;

			if (rowElm.hasAttribute("data-unfolded")) {
				rowElm.removeAttribute("data-unfolded");
				utils.removeClass(rowElm, "unfolded");
				fold = true;
			} else {
				rowElm.setAttribute("data-unfolded", "true");
				utils.addClass(rowElm, "unfolded");
				fold = false;
			}

			rowElm = rowElm.nextSibling;
			while (rowElm && (currDepth = Number(rowElm.getAttribute("data-depth"))) > depth) {
				if (currDepth < unfoldedLevel) {
					unfoldedLevel = currDepth;
				}
				if (currDepth === unfoldedLevel) {
					if (rowElm.hasAttribute("data-unfolded")) {
						unfoldedLevel += 1;
					}
					if (fold) {
						utils.addClass(rowElm, "hidden");
					} else {
						utils.removeClass(rowElm, "hidden");
					}
				}
				rowElm = rowElm.nextSibling;
			}
		},
		generateTreeTableBody: function(data, depth) {
			var tableBody, recordLabel, rowDataArray, rowElm, fragment, hasChildren, unfoldElm;

			if (depth === undefined) {
				depth = 0;
			}

			fragment = document.createDocumentFragment();

			for (recordLabel in data) {
				if (data.hasOwnProperty(recordLabel)) {
					rowDataArray = [
						recordLabel,
						data[recordLabel].count,
						data[recordLabel].total + "ms",
						data[recordLabel].totalAverage + "ms",
						data[recordLabel].self + "ms",
						data[recordLabel].selfAverage + "ms"
					];
					hasChildren = data[recordLabel].hasChildren;
					rowElm = utils.arrayToTableRow(rowDataArray, false);
					rowElm.setAttribute("data-depth", depth);
					if (depth !== 0) {
						utils.addClass(rowElm, "hidden");
					}
					rowElm.firstChild.style.paddingLeft = (depth * 14 + 20) + "px";
					if (hasChildren) {
						unfoldElm = document.createElement("span");
						unfoldElm.className = "foldHandleElm";
						unfoldElm.addEventListener("click", this.toggleTreeChildren, false);
						rowElm.firstChild.appendChild(unfoldElm);
					}
					fragment.appendChild(rowElm);
					fragment.appendChild(this.generateTreeTableBody(data[recordLabel].children, depth + 1));
				}
			}
			
			if (depth === 0) {
				tableBody = document.createElement("tbody");
				tableBody.className = "tree";
				tableBody.appendChild(fragment);
				return tableBody;
			} else {
				return fragment;
			}
		},
		
		/**
		 *
		 * Generates plain data for the plain table:
		 * data = {
		 *     "record1": {
		 *         count: 5,
		 *         total: 30,
		 *         totalAverage: 6,
		 *         self: 5,
		 *         selfAverage: 1
		 *     },
		 *     "record2": {
		 *         ...
		 *     }, ...
		 * }
		 *
		 * @param {Array} results
		 * @param {Object} [data={}]
		 * @returns {Object}
		 */
		generatePlainData: function(results, data) {
			var i, resultRecord, dataRecord, recordLabel;

			if (data === undefined) {
				data = {};
			}

			for (i = 0; i < results.length; i++) {
				resultRecord = results[i];
				recordLabel = results[i].name;
				if (!data.hasOwnProperty(recordLabel)) {
					data[recordLabel] = {
						count: 0,
						total: 0,
						totalAverage: 0,
						self: 0,
						selfAverage: 0
					};
				}
				dataRecord = data[recordLabel];
				dataRecord.count += 1;
				dataRecord.total += resultRecord.total;
				dataRecord.totalAverage = Math.round(dataRecord.total / dataRecord.count);
				dataRecord.self += resultRecord.self;
				dataRecord.selfAverage = Math.round(dataRecord.self / dataRecord.count);

				this.generatePlainData(resultRecord.children, data);
			}

			return data;
		},
		generatePlainTableBody: function(data) {
			var tableBody, recordLabel, dataRecord, fragment, rowDataArray;

			fragment = document.createDocumentFragment();

			for (recordLabel in data) {
				if (data.hasOwnProperty(recordLabel)) {
					dataRecord = data[recordLabel];
					rowDataArray = [
						recordLabel,
						dataRecord.count,
						dataRecord.total + "ms",
						dataRecord.totalAverage + "ms",
						dataRecord.self + "ms",
						dataRecord.selfAverage + "ms"
					];
					fragment.appendChild(utils.arrayToTableRow(rowDataArray, false));
				}
			}

			tableBody = document.createElement("tbody");
			tableBody.className = "plain";
			tableBody.appendChild(fragment);
			
			return tableBody;
		},
		addStyleElement: function() {
			var css, cssTextNode;

			css = "/*__CSS__*/";

			cssTextNode = document.createTextNode(css);

			this.styleElement = document.createElement("style");
			this.styleElement.type = "text/css";
			this.styleElement.appendChild(cssTextNode);

			document.getElementsByTagName("head")[0].appendChild(this.styleElement);
		},
		showTableType: function(type) {

			if (type === this.currentType) {
				// If specified type is already shown return 
				return;
			}

			if (this.currentTableBodyElement) {
				this.currentTableBodyElement.parentNode.removeChild(this.currentTableBodyElement);
			}

			if (this.currentTableHeadElement) {
				this.currentTableHeadElement.parentNode.removeChild(this.currentTableHeadElement);
			}

			switch (type) {
				case "tree":
					this.dropDownButtonLabelElm.textContent = "tree";
					this.currentTableBodyElement = this.treeTableBodyElement;
					this.currentTableHeadElement = this.regularTableHeadElement;
					break;
				case "plain":
					this.dropDownButtonLabelElm.textContent = "plain";
					this.currentTableBodyElement = this.plainTableBodyElement;
					this.currentTableHeadElement = this.regularTableHeadElement;
					break;
				case "waterfall":
					this.dropDownButtonLabelElm.textContent = "waterfall";
					this.currentTableBodyElement = this.waterfallContainerElement;
					this.currentTableHeadElement = this.waterfallTableHeadElement;
					break;
				default:
			}

			this.footerGroupElm.parentNode.insertBefore(this.currentTableBodyElement, this.footerGroupElm);
			this.currentTableBodyElement.parentNode.insertBefore(this.currentTableHeadElement, this.currentTableBodyElement);
			this.currentType = type;
		},
		generateDropDown: function() {
			var	self = this,
				opened = false,
				dropDownElm,
				dropDownButtonElm,
				dropDownListElm,
				treeDropDownListItem,
				plainDropDownListItem,
				waterfallDropDownListItem,
				caretElm;

			function toggleDropDownList(e) {
				if (this === document) {
					if (utils.isDescendantOf(e.target, dropDownElm)) {
						return;
					}
				}
				if (opened) {
					opened = false;
					utils.removeClass(dropDownElm, "open");
					document.removeEventListener(utils.isTouch ? "touchstart" : "mousedown", toggleDropDownList, false);
				} else {
					opened = true;
					utils.addClass(dropDownElm, "open");
					document.addEventListener(utils.isTouch ? "touchstart" : "mousedown", toggleDropDownList, false);
				}
			}

			dropDownButtonElm = document.createElement("div");
			dropDownButtonElm.className = "dropDownButton";
			this.dropDownButtonLabelElm = document.createElement("span");
			caretElm = document.createElement("span");
			caretElm.className = "caret";
			dropDownButtonElm.appendChild(this.dropDownButtonLabelElm);
			dropDownButtonElm.appendChild(caretElm);
			dropDownButtonElm.addEventListener("click", toggleDropDownList, false);

			treeDropDownListItem = document.createElement("li");
			treeDropDownListItem.appendChild(document.createTextNode("tree"));
			treeDropDownListItem.addEventListener("click", function (e) {
				toggleDropDownList(e);
				self.showTableType("tree");
			}, false);

			plainDropDownListItem = document.createElement("li");
			plainDropDownListItem.appendChild(document.createTextNode("plain"));
			plainDropDownListItem.addEventListener("click", function (e) {
				toggleDropDownList(e);
				self.showTableType("plain");
			}, false);

			waterfallDropDownListItem = document.createElement("li");
			waterfallDropDownListItem.appendChild(document.createTextNode("waterfall"));
			waterfallDropDownListItem.addEventListener("click", function (e) {
				toggleDropDownList(e);
				self.showTableType("waterfall");
			}, false);

			dropDownListElm = document.createElement("ul");
			dropDownListElm.className = "dropDownList";
			dropDownListElm.appendChild(treeDropDownListItem);
			dropDownListElm.appendChild(plainDropDownListItem);
			dropDownListElm.appendChild(waterfallDropDownListItem);

			dropDownElm = document.createElement("div");
			dropDownElm.className = "dropDown";
			dropDownElm.appendChild(dropDownButtonElm);
			dropDownElm.appendChild(dropDownListElm);

			return dropDownElm;
		},
		addTableElement: function() {

			var trElm, thElm,
				footerRowElm,
				footerCellElm;

			this.regularTableHeadElement = document.createElement("thead");
			this.regularTableHeadElement.appendChild(utils.arrayToTableRow(["Function", "Calls", "Total", "Total Average", "Self", "Self Average"], true));

			trElm = document.createElement("tr");
			thElm = document.createElement("th");
			thElm.appendChild(document.createTextNode("Function"));
			thElm.style.width = "5%";
			trElm.appendChild(thElm);
			thElm = document.createElement("th");
			thElm.setAttribute("colspan", "5");
			thElm.appendChild(document.createTextNode("Timeline"));
			trElm.appendChild(thElm);
			this.waterfallTableHeadElement = document.createElement("thead");
			this.waterfallTableHeadElement.appendChild(trElm);

			footerCellElm = document.createElement("td");
			footerCellElm.setAttribute("colspan", "6");
			footerCellElm.appendChild(document.createTextNode("Table type: "));
			footerCellElm.appendChild(this.generateDropDown());

			footerRowElm = document.createElement("tr");
			footerRowElm.appendChild(footerCellElm);

			this.footerGroupElm = document.createElement("tfoot");
			this.footerGroupElm.appendChild(footerRowElm);

			this.tableElm = document.createElement("table");
			this.tableElm.appendChild(this.footerGroupElm);

			this.tableContainerElement = document.createElement("div");
			this.tableContainerElement.className = "jsProfilerContainer " + (utils.isTouch ? "touch" : "nonTouch");
			this.tableContainerElement.appendChild(this.tableElm);
		},
		handleEvent: function(event) {

			var touch = utils.isTouch ? event.changedTouches[0] : event;

			if (touch.currentTarget === document) {
				if (!utils.isDescendantOf(touch.target, this.tableElm)) {
					this.hideTable();
				}
			}

		},
		showTable: function(results) {

			this.treeTableBodyElement = this.generateTreeTableBody(this.generateTreeData(results));
			this.plainTableBodyElement = this.generatePlainTableBody(this.generatePlainData(results));
			this.waterfallContainerElement = this.generateWaterfallTableBody(results);

			if (this.styleElement === null) {
				this.addStyleElement();
			}

			if (this.tableContainerElement === null) {
				this.addTableElement();
			}

			if (this.tableContainerElement.parentNode === null) {
				document.body.appendChild(this.tableContainerElement);
			}

			document.addEventListener(utils.isTouch ? "touchstart" : "mousedown", this, false);

			this.currentType = null;
			this.showTableType("waterfall");
		},
		hideTable: function() {
			document.removeEventListener(utils.isTouch ? "touchstart" : "mousedown", this, false);
			this.tableContainerElement.parentNode.removeChild(this.tableContainerElement);
		}
	};

	utils = {
		isTouch: (typeof window.ontouchstart !== "undefined"),
		trim: function(str) {
			return str.replace(trimRegExp, "");
		},
		empty: function(element) {
			while (element.firstChild) {
				element.removeChild(element.firstChild);
			}
		},
		isDescendantOf: function(descendant, ancestor) {
			while (descendant !== null && descendant !== ancestor) {
				descendant = descendant.parentNode;
			}
			return descendant !== null;
		},
		/**
		 * Utility method that creates table row "tr" with table cells "td" or "th" from an array of strings.
		 *
		 * @param {Array} dataArray Array of strings
		 * @param {Boolean} header
		 * @returns {HTMLElement}
		 */
		arrayToTableRow: function (dataArray, header) {
			var i, trElm, cellElm;

			trElm = document.createElement("tr");

			for (i = 0; i < dataArray.length; i++) {
				if (header) {
					cellElm = document.createElement("th");
				} else {
					cellElm = document.createElement("td");
				}
				cellElm.appendChild(document.createTextNode(dataArray[i]));
				trElm.appendChild(cellElm);
			}

			return trElm;
		},
		hasClass: (typeof testEl.classList !== "undefined" ?
			function (element, className) {
				return element.classList.contains(className);
			} :
			function (element, className) {
				return (new RegExp("\\b" + className + "\\b")).test(element.className);
			}),
		addClass: (typeof testEl.classList !== "undefined" ?
			function (element, className) {
				var classesArray = utils.trim(className).split(/\s+/), i;
				for (i = 0; i < classesArray.length; i++) {
					element.classList.add(classesArray[i]);
				}
			} :
			function (element, className) {
				var classesArray = utils.trim(className).split(/\s+/), i;

				for (i = 0; i < classesArray.length; i++) {
					if (!utils.hasClass(element, classesArray[i])) {
						element.className += (element.className ? ' ' : '') + classesArray[i];
					}
				}
			}),
		removeClass: (typeof testEl.classList !== "undefined" ?
			function (element, className) {
				var classesArray = utils.trim(className).split(/\s+/), i;
				for (i = 0; i < classesArray.length; i++) {
					element.classList.remove(classesArray[i]);
				}
			} :
			function (element, className) {
				var classesArray = utils.trim(className).split(/\s+/),
					classes, index, i;

				classes = utils.trim(element.className).split(/\s+/);

				for (i = 0; i < classesArray.length; i++) {
					index = classes.indexOf(classesArray[i]);
					if (index > -1){
						classes.splice(index, 1);
					}
				}

				element.className = classes.join(' ');
			})
	};

}).apply(JsProfiler);