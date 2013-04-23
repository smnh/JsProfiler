var profiler = new JsProfiler(),
	rootRecord, wfChart;

profiler.registerFunction(window, "doSomething", "window");
profiler.registerClass(window, "MyClass");
profiler.registerObject(obj, "obj");

function startProfiler() {
	var intervalRecord, interval, count = 0, numOfIntervals = 2, timeoutCount = 0;

	profiler.reset();
	profiler.start();

	profiler.begin("synchWrapper");

	intervalRecord = profiler.begin("setInterval");
	interval = window.setInterval(function () {

		var setTiemoutRecord = profiler.begin("setTiemout", intervalRecord);
		window.setTimeout(function () {
			profiler.setAsyncContext(setTiemoutRecord);
			doSomething();
			profiler.removeAsyncContext();
			if (++timeoutCount === numOfIntervals) {
				stopProfiler();
			}
		}, 500);
		profiler.end("setTiemout");

		if (++count === numOfIntervals) {
			window.clearInterval(interval);
		}
	}, 2000);
	profiler.end("setInterval");

	doSomething();
	profiler.end("synchWrapper");
}

function stopProfiler() {
	profiler.stop();

	rootRecord = profiler.getRootRecord();

	wfChart = new JsProfiler.WaterfallChart();
	wfChart.setResults(rootRecord);
	wfChart.show();
}