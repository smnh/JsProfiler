WaterfallChart.WCRecordModel = (function(){
	
	/**
	 * @name WaterfallChart.WCRecordModel
	 * 
	 * @param {JsProfiler.Record} record    JsProfiler record.
	 * @param {Number} absoluteStart        Relative time from which all other times are measured.
	 * 
	 * @property {String}   id                  The id of the record.
	 * @property {String}   parentId            The id of the synchronous parent record. For asynchronous records this field always holds the id of the root record as they are always first records in the execution stack.
	 * @property {String}   asyncParentId       The id of the asynchronous parent record. For synchronous records this field is always null.
	 * @property {String}   name                The name of the record.
	 * @property {Boolean}  async               Flag indicating whether the record is asynchronous or not relative to its parent record.
	 * @property {Boolean}  folded              Flag indicating whether the record is folded or not.
	 * @property {Number}   start               Start time of the record.
	 * @property {Number}   end                 Synchronous end time of the record.
	 * @property {Number}   duration            Synchronous execution time of the record including synchronous execution time of its synchronous children.
	 * @property {Number}   self                Synchronous execution time of the record not including synchronous execution time of its synchronous children.
	 * @property {Number}   asyncEnd            Asynchronous end time of the record including its synchronous and asynchronous children recursively.
	 * @property {Number}   asyncDuration       Asynchronous execution time of the record including its synchronous and asynchronous children recursively.
	 * @property {Array}    asyncChildrenTimes  Array of objects with start and duration times of all asynchronous descendant records.
	 * @property {Array}    children            Array of WCRecordModels specifying all synchronous children.
	 * @property {Array}    asyncChildren       Array of WCRecordModels specifying all asynchronous children.
	 * @property {Array}    allChildren         Array of WCRecordModels specifying all children.
	 * 
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
		this.asyncChildren = [];
		this.allChildren = [];
		this.folded = true;
	}

	WCRecordModel.prototype.addRecord = function(wcRecord) {
		
		if (!wcRecord.async) {
			this.children.push(wcRecord);
			this.self -= wcRecord.duration;
		} else {
			this.asyncChildren.push(wcRecord);
			this.asyncChildrenTimes.push({
				start: wcRecord.start,
				duration: wcRecord.duration
			});
		}
		
		this.allChildren.push(wcRecord);

		this.asyncChildrenTimes = this.asyncChildrenTimes.concat(wcRecord.asyncChildrenTimes);
		
		if (wcRecord.asyncEnd > this.asyncEnd) {
			this.asyncEnd = wcRecord.asyncEnd;
			this.asyncDuration = this.asyncEnd - this.start;
		}
	};
	
	return WCRecordModel;
}());