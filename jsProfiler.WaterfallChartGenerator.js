(function () {

    var styleElement = null,
        dev = true;

    function WaterfallChartGenerator() {
        this._resultArray = null;
        this._element = null;
        this._elements = {};
        this._generate();
    }

	WaterfallChartGenerator.prototype = {
		constructor: WaterfallChartGenerator,
        _createElement: function () {
            if (!dev) {
                this._element = window.document.createElement("div");
                this._element.innerHTML = "<div class=\"jsp_wc_container jsp_fillParent\"><div class=\"jsp_wc_curtain jsp_fillParent\"></div><div class=\"jsp_wc_table\"><div class=\"jsp_wc_timelineOverview\"><div class=\"jsp_wc_rightColumn jsp_wc_row\"></div></div><div class=\"jsp_wc_scrollView\"><div class=\"jsp_wc_leftColumn\"><div class=\"jsp_wc_row jsp_wc_recordNamesHeader\">Records</div><div class=\"jsp_wc_recordNames\"></div></div><div class=\"jsp_wc_rightColumn\"></div></div><div class=\"jsp_wc_row jsp_wc_timeline\"></div></div></div>";
            } else {
                this._element = document.getElementsByClassName("jsp_wc_container")[0];
            }
        },
		_generate: function() {
            this._createElement();
            this._elements.recordNames = this._element.querySelector(".jsp_wc_recordNames");
            this._elements.records = this._element.querySelector(".jsp_wc_rightColumn");
		},
		_addRecord: function(record) {
			var div = document.createElement("div");
			div.innerHTML = record.name;
			this.elements.recordNames.appendChild(div);
		},
        _addStyleElement: function () {
            var css, cssTextNode;

            if (styleElement !== null) {
                return;
            }

            css = ".jsp_fillParent { position: absolute; left: 0; top: 0; width: 100%; height: 100%; } .jsp_wc_curtain { background-color: #000000; opacity: 0.5; } .jsp_wc_table { position: relative; margin: 20px auto 0; width: 800px; overflow: hidden; color: #333333; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; line-height: 18px; border: 1px solid #5e5e5e; background-color: #ffffff; /*-webkit-border-radius: 4px; -moz-border-radius: 4px; -ms-border-radius: 4px; border-radius: 4px;*/ -webkit-box-shadow: 0 0 10px rgba(0, 0, 0, 0.4); -moz-box-shadow: 0 0 10px rgba(0, 0, 0, 0.4); -ms-box-shadow: 0 0 10px rgba(0, 0, 0, 0.4); box-shadow: 0 0 10px rgba(0, 0, 0, 0.4); } .jsp_wc_row { height: 18px; line-height: 18px; } .jsp_wc_timelineOverview { border-bottom: 1px solid #8e8e8e; } .jsp_wc_timeline { position: absolute; z-index: 1; opacity: 0.8; left: 201px; right: 0; top: 19px; background-color: #fefefe; border-bottom: 1px solid #8e8e8e; } .jsp_wc_scrollView { position: relative; z-index: 0; height: 400px; overflow: auto; } /***** left column *****/ .jsp_wc_leftColumn { position: absolute; width: 200px; font-size: 12px; background-color: #d5dde5; } .jsp_wc_leftColumn .jsp_wc_row { padding: 0 10px; } .jsp_wc_leftColumn .jsp_wc_recordNames .jsp_wc_row:nth-child(odd) { background-color: #cad1d9; } .jsp_wc_leftColumn .jsp_wc_recordNamesHeader { font-weight: bold; color: #5c6e81; } /***** right column *****/ .jsp_wc_rightColumn { margin-left: 200px; border-left: 1px solid #8e8e8e; background-color: #ffffff; } .jsp_wc_rightColumn .jsp_wc_row:first-child { padding-top: 18px; } .jsp_wc_rightColumn .jsp_wc_row { position: relative; } .jsp_wc_rightColumn .jsp_wc_row:nth-child(odd) { background-color: #f2f2f2; } .jsp_wc_recordContainer { position: relative; z-index: 1; float:left; clear:left; } .jsp_wc_record { height: 18px; } .jsp_wc_recordBracket { position: absolute; left: -16px; top: 0; bottom: 0; width: 2px; border: 1px solid #a3a3a3; border-right: none; } .jsp_wc_foldHandleFolded { position: absolute; left: -12px; top: 4px; width: 0; height: 0; border-left: 8px solid #888888; border-top: 5px solid transparent; border-bottom: 5px solid transparent; } .jsp_wc_foldHandleUnfolded { position: absolute; left: -13px; top: 5px; width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 8px solid #888888; } .jsp_wc_recordBar { -webkit-box-sizing: border-box; -moz-box-sizing: border-box; box-sizing: border-box; top: 4px; height: 10px; border: 1px solid #dca92e; background-color: #f5c34f; min-width: 5px; } .jsp_wc_recordBar.jsp_wc_selfRecordBar { position: relative; top: 0; margin: 4px 0; /*width: 100%;*/ } .jsp_wc_recordBar.jsp_wc_asyncRecordBar { position: absolute; opacity: 0.4; width: 100%; } .jsp_wc_recordBar.jsp_wc_asyncCPURecordBar { position: absolute; opacity: 0.4; }";

            cssTextNode = document.createTextNode(css);

            styleElement = document.createElement("style");
            styleElement.type = "text/css";
            styleElement.appendChild(cssTextNode);

            document.getElementsByTagName("head")[0].appendChild(styleElement);
        },
        _update: function () {
            for (var i = 0; i < this._resultArray.length; i++) {
                self._addRecord(this._resultArray[i]);
            }
        },
        setResults: function (resultsArray) {
            this._resultArray = resultsArray;
            this._update();
        },
        show: function () {

        }
	};
	
}).apply(JsProfiler);