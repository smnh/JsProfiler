var fs = require("fs"),
    jsFileName = "JsProfiler.WaterfallChartGenerator.js",
    cssFileName = "WaterfallChart.css",
    htmlFileName = "WaterfallChart.html",
    cssLoaded = false,
    htmlLoaded = false;

console.log("reading " + jsFileName + " ...");
fs.readFile(jsFileName, 'utf8', function (err, fileData) {
    
    if (err) {
        console.log("error while reading " + jsFileName + ": " + err);
        return;
    }

    console.log("finished reading " + jsFileName);

    function checkFiles() {
        if (cssLoaded && htmlLoaded) {
            fs.writeFile("./../jsProfiler.WaterfallChartGenerator.js", fileData, "utf8", function (err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("finished");
                }
            });
        }
    }
    
    console.log("reading " + cssFileName + " ...");
    fs.readFile(cssFileName, 'utf8', function (err, cssData) {
        
        if (err) {
            console.log("error while reading " + cssFileName + ": " + err);
            return;
        }

        console.log("finished reading " + cssFileName);
        cssData = cssData.replace(/"/g, "\\\"").replace(/\s*\n\s*|\s{2,}|\t/g, " ");
        fileData = fileData.replace("__CSS__", cssData);
        cssLoaded = true;
        checkFiles();
    });
    
    console.log("reading " + htmlFileName + " ...");
    fs.readFile(htmlFileName, 'utf8', function (err, htmlData) {
        
        var startExtractToken = "<!-- HTML_BEGIN -->",
            endExtractToken = "<!-- HTML_END -->",
            startExcludeToken = "<!-- HTML_EXCLUDE_BEGIN -->",
            endExcludeToken = "<!-- HTML_EXCLUDE_END -->",
//            excludeRegExp = new RegExp(startExcludeToken + "[\\s\\S]*?" + endExcludeToken),
            startExtractIndex, endExtractIndex,
            startExcludeIndex, endExcludeIndex;
        
        if (err) {
            console.log("error while reading " + htmlFileName + ": " + err);
            return;
        }

        console.log("finished reading " + htmlFileName);
        
        startExtractIndex = htmlData.indexOf(startExtractToken);
        if (startExtractIndex > -1) {
            console.log("startExtractIndex: " + startExtractIndex);
            endExtractIndex = htmlData.indexOf(endExtractToken, startExtractIndex);
            htmlData = htmlData.substring(startExtractIndex + startExtractToken.length, endExtractIndex);
        }
        
        startExcludeIndex = htmlData.indexOf(startExcludeToken);
        while (startExcludeIndex > -1) {
            console.log("startExcludeIndex: " + startExcludeIndex);
            endExcludeIndex = htmlData.indexOf(endExcludeToken, startExcludeIndex);
            console.log("endExcludeIndex: " + endExcludeIndex);
            htmlData = htmlData.substring(0, startExcludeIndex) + htmlData.substring(endExcludeIndex + endExcludeToken.length);
            startExcludeIndex = htmlData.indexOf(startExcludeToken);
        }
        
        htmlData = htmlData.replace(/"/g, "\\\"").replace(/\s*\n\s*|\t/g, "");
        fileData = fileData.replace("__HTML__", htmlData);
        htmlLoaded = true;
        checkFiles();
    });
});
