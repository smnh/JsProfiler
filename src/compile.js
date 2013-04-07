var fs = require("fs"), i,
	fileOrder = ["JsProfiler.js", "JsProfiler.HtmlTableGenerator.js", "JsProfiler.ConsoleTableGenerator.js", "WaterfallChart.js"],
	fileLoadCounter = 0;
	fileContents = {};

function checkFiles() {
	var i, fileName, compiledData = "";
	fileLoadCounter++;
	if (fileLoadCounter === fileOrder.length) {
		for (i = 0; i < fileOrder.length; i++) {
			fileName = fileOrder[i];
			compiledData += (compiledData ? "\n\n" : "") + fileContents[fileName];
		}
		console.log("writing compiled data to file...");
		fs.writeFile("./../JsProfiler.js", compiledData, "utf8", function(err) {
			if (err) {
				console.log(err);
			} else {
				console.log("finished");
			}
		});
	}
}

for (i = 0; i < fileOrder.length; i++) {
	var fileName = fileOrder[i];
	console.log("reading " + fileName + " ...");
	fs.readFile(fileName, 'utf8', function(fileName) {
		return function(err, jsData) {
			if (err) {
				console.log("error while reading " + fileName + ": " + err);
				return;
			}
			
			console.log("finished to read " + fileName);
			if (fileName === "JsProfiler.HtmlTableGenerator.js") {
				console.log("reading HtmlTableGenerator.css ...");
				fs.readFile("HtmlTableGenerator.css", 'utf8', function(err, cssData) {
					if (err) {
						console.log("error while reading HtmlTableGenerator.css: " + err);
						return;
					}

					console.log("finished to read HtmlTableGenerator.css");
					cssData = cssData.replace(/"/g, "\\\"").replace(/[\n\t]/g, "");
					jsData = jsData.replace("/*__CSS__*/", cssData);
					fileContents[fileName] = jsData;
					checkFiles();
				});
			} else if (fileName === "WaterfallChart.js") {
				console.log("reading WaterfallChart.html ...");
				fs.readFile("WaterfallChart.html", 'utf8', function (err, htmlData) {
					if (err) {
						console.log("error while reading WaterfallChart.html: " + err);
						return;
					}

					console.log("finished to read WaterfallChart.html");
					htmlData = htmlData.replace(/"/g, "\\\"").replace(/[\n\t]/g, "");
					jsData = jsData.replace("__HTML__", htmlData);
					fileContents[fileName] = jsData;
					checkFiles();
				});
			} else {
				fileContents[fileName] = jsData;
				checkFiles();
			}
		};
	}(fileName));
}
