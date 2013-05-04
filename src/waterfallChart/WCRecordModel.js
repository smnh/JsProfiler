WaterfallChart.WCRecordModel = (function(){
	
	/**
	 * @name WaterfallChart.WCRecordModel
	 * @param {JsProfiler.Record} record
	 * @param {Number} absoluteStart
	 * @constructor
	 */
	function WCRecordModel(record, absoluteStart) {
		this.id = record.id;
		this.parentId = record.parentId;
		this.asyncParentId = record.asyncParentId;
		this.name = record.name;
		this.async = record.async;
		this.start = record.start - absoluteStart;
		this.end = record.end - absoluteStart;
		this.duration = this.end - this.start;
		this.self = this.duration;
		this.asyncEnd = this.end;
		this.asyncDuration = this.duration;
		this.asyncChildrenTimes = [];
		this.children = [];
		this.folded = true;
	}
	
	return WCRecordModel;
}());