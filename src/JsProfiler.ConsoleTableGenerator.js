(function() {
	
	/**
	 * @namespace ConsoleTableGenerator prints JsProfiler results to console.
	 *
	 * @example
	 * var results = jsProfilerInstance.getResults();
	 * JsProfiler.ConsoleTableGenerator.printResults(results);
	 */
	this.ConsoleTableGenerator = {
		headerRow: ["Self", "Self Average", "Total", "Total Average", "Calls", "Function"],
		tableCellWidth: [10, 14, 10, 15, 10, 10],
		arrayToTableRow: function(arr, center) {
			var i, tableRow = "", availableSpace, leftSpace, rightSpace, itemStrLength;
			for (i = 0; i < arr.length; i++) {
				if (i !== arr.length - 1) {
					itemStrLength = String(arr[i]).length;
					availableSpace = this.tableCellWidth[i] - itemStrLength;
					if (availableSpace >= 0) {
						if (center) {
							leftSpace = Math.ceil(availableSpace / 2);
						} else {
							leftSpace = 1;
						}
						rightSpace = availableSpace - leftSpace;
					} else {
						leftSpace = 0;
						rightSpace = 0;
					}
					tableRow += (i > 0 ? "|" : "") + new Array(leftSpace + 1).join(" ") + arr[i] + new Array(rightSpace + 1).join(" ");
				} else {
					tableRow += "| " + arr[i];
				}
			}
			return tableRow;
		},
		generateTableRows: function(results, indentLevel) {
			var recordLabel, rowDataArray, output = "";

			for (recordLabel in results) {
				if (results.hasOwnProperty(recordLabel)) {
					rowDataArray = [
						results[recordLabel].self + "ms",
						results[recordLabel].selfAverage + "ms",
						results[recordLabel].total + "ms",
						results[recordLabel].totalAverage + "ms",
						results[recordLabel].count,
						new Array(indentLevel + 1).join("    ") + recordLabel
					];
					output += "\n" + this.arrayToTableRow(rowDataArray);
					output += this.generateTableRows(results[recordLabel].children, indentLevel + 1);
				}
			}

			return output;
		},
		generateTreeData: function(results) {
			
			var rootData = {};
			
			function processRecord(_results, _data) {
				
				var i, resultRecord, dataRecord, recordLabel;
				
				for (i = 0; i < _results.length; i++) {
					resultRecord = _results[i];
					
					if (resultRecord.async) {
						_data = rootData;
					} // No need to "else" check for non asynchronous children, because all child records after the first asynchronous child record must be asynchronous.
					
					recordLabel = resultRecord.name;
					if (!_data.hasOwnProperty(recordLabel)) {
						_data[recordLabel] = {
							count: 0,
							total: 0,
							totalAverage: 0,
							self: 0,
							selfAverage: 0,
							children: {}
						}
					}
					dataRecord = _data[recordLabel];
					dataRecord.count += 1;
					dataRecord.total += resultRecord.total;
					dataRecord.totalAverage = Math.round((dataRecord.totalAverage * (dataRecord.count - 1) + resultRecord.total) / dataRecord.count);
					dataRecord.self += resultRecord.self;
					dataRecord.selfAverage = Math.round((dataRecord.selfAverage * (dataRecord.count - 1) + resultRecord.self) / dataRecord.count);
					processRecord(resultRecord.children, dataRecord.children);
				}
			}
			
			processRecord(results, rootData);
			
			return rootData; 
		},
		generateResultsTable: function(results) {
			var output, i;

			output = this.arrayToTableRow(this.headerRow, true) + "\n";
			for (i = 0; i < this.tableCellWidth.length; i++) {
				output += new Array(this.tableCellWidth[i] + 2).join("-");
			}
			results = this.generateTreeData(results);
			output += this.generateTableRows(results, 0);

			return output;
		},
		printResults: function(results) {
			var output = this.generateResultsTable(results);
			console.log(output);
		}
	};
	
}).apply(JsProfiler);