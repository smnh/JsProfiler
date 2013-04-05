var fs = require("fs"),
    jsFileName = "WaterfallChart.js",
    cssFileName = "WaterfallChart.css",
    htmlFileName = "WaterfallChart.html",
	compiledDir = "./../../compiled/",
	compiledFileName = "WaterfallChart_compiled.js",
	encoding = "utf8",
    cssLoaded = false,
    htmlLoaded = false;

console.log("reading " + jsFileName + " ...");
fs.readFile(jsFileName, encoding, function (err, jsData) {
    
    if (err) {
        console.error("error while reading " + jsFileName + ": " + err.message);
        return;
    }

    console.log("finished reading " + jsFileName);

	jsData = jsData.replace("dev = true", "dev = false");
	
    function checkFiles() {
        if (cssLoaded && htmlLoaded) {
			console.log("writing " + compiledFileName + " ...");
            fs.writeFile(compiledDir + compiledFileName, jsData, encoding, function (err) {
                if (err) {
                    console.error("error white writing " + compiledFileName + ": " + err.message);
                } else {
                    console.log("finished writing " + compiledFileName);
                }
            });
        }
    }
    
    console.log("reading " + cssFileName + " ...");
    fs.readFile(cssFileName, encoding, function (err, cssData) {
        
        if (err) {
            console.error("error while reading " + cssFileName + ": " + err.message);
            return;
        }

        console.log("finished reading " + cssFileName);
		
        cssData = cssData.replace(/"/g, "\\\"").replace(/\s*\n\s*|\s{2,}|\t/g, " ");
        jsData = jsData.replace("__CSS__", cssData);
		
        cssLoaded = true;
        checkFiles();
    });
    
    console.log("reading " + htmlFileName + " ...");
    fs.readFile(htmlFileName, encoding, function (err, htmlData) {
        
        var startExtractToken = "<!-- HTML_BEGIN -->",
            endExtractToken = "<!-- HTML_END -->",
            startExcludeToken = "<!-- HTML_EXCLUDE_BEGIN -->",
            endExcludeToken = "<!-- HTML_EXCLUDE_END -->",
            startExtractIndex, endExtractIndex,
            startExcludeIndex, endExcludeIndex;
        
        if (err) {
            console.error("error while reading " + htmlFileName + ": " + err.message);
            return;
        }

        console.log("finished reading " + htmlFileName);
        
        startExtractIndex = htmlData.indexOf(startExtractToken);
        if (startExtractIndex > -1) {
            endExtractIndex = htmlData.indexOf(endExtractToken, startExtractIndex);
            htmlData = htmlData.substring(startExtractIndex + startExtractToken.length, endExtractIndex);
        }
        
        startExcludeIndex = htmlData.indexOf(startExcludeToken);
        while (startExcludeIndex > -1) {
            endExcludeIndex = htmlData.indexOf(endExcludeToken, startExcludeIndex);
            htmlData = htmlData.substring(0, startExcludeIndex) + htmlData.substring(endExcludeIndex + endExcludeToken.length);
            startExcludeIndex = htmlData.indexOf(startExcludeToken);
        }
        
        htmlData = htmlData.replace(/"/g, "\\\"").replace(/\s*\n\s*|\t/g, "");
        jsData = jsData.replace("__HTML__", htmlData);
		
        htmlLoaded = true;
        checkFiles();
    });
});
