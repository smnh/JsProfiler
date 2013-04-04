(function() {

	/**
	 * JavaScript Profiling Tool
	 * @constructor
	 */
	function JsProfiler() {
		this._profiling = false;
		this.reset();
	}
	
	this.JsProfiler = JsProfiler;

    /**
     * Represents a profile Record.
	 *
	 * Record can have synchronous and asynchronous children.
	 * The time range of all the synchronous child records must be within the time range of their parent record.
	 * The time range of all asynchronous child records must be outside and after the time range of their parent record.
	 * Additionally, asynchronous children are always located at the top of the records stack.
	 * 
     * @param {String}     name      The name of the record
     * @param {Boolean}    async     A boolean flag indicating if the record is an asynchronous relative to its parent.
	 * 
	 * @property {String}  name      Same as the name parameter.
	 * @property {Boolean} async     Same as the async parameter.
	 * @property {Number}  start     The start date of the record.
	 * @property {Number}  end       The end data of the record.
	 * @property {Array}   children  Child records of the records.
	 * 
     * @constructor
     */
    JsProfiler.Record = function Record(name, async) {
        this.name = name;
        this.async = async;
        this.start = Date.now();
        this.end = null;
        this.children = [];
    };
    
	JsProfiler.prototype = {
		constructor: JsProfiler,
		
		/**
		 * Resets the profiled data.
		 * Must not be invoked while profiling.
		 */
		reset: function() {
			
			if (this._profiling) {
				throw new Error("Can't reset profiled data while profiler is running.");
			}
			
			this._leafRecord = null;
			this._recordsStack = [];
		},
		
		/**
		 * Starts profiling
		 */
		start: function() {
			
			if (this._profiling) {
				throw new Error("Can't start profiler, profiler was already started.");
			}
			
			this._profiling = true;
			this._leafRecord = new JsProfiler.Record("root", false);
		},
		
		/**
		 * Stops profiling
		 */
		stop: function() {
			
			if (!this._profiling) {
				throw new Error("Can't stop profiler, profiler was not started.");
			}
			
			if (this._recordsStack.length !== 0) {
				throw new Error("Can't stop profiler until all registered functions executed.");
			}
			
			this._profiling = false;
			this._leafRecord.end = Date.now();
		},

		/**
		 * Create and begin profiling single record.
		 * 
		 * @param {String} recordLabel A label that describes the record.
		 * @param {JsProfiler.Record} [asyncContextRecord] Parent record which asynchronously led to the creation of this record.
		 *                            If this parameter is specified then this record must be the first record in a record stack
		 *                            and all previous records must be ended.
		 * @returns {JsProfiler.Record} The created record object. Can be used to create asynchronous child records.
		 */
		begin: function(recordLabel, asyncContextRecord) {

			if (!this._profiling) {
				return null;
			}
			
			var hasAsyncContext = (typeof asyncContextRecord !== "undefined"),
				record,
				parentRecord;
			
			if (hasAsyncContext && this._recordsStack.length !== 0) {
				throw new Error("Can't begin record '" + recordLabel + "' in asynchronous record context '" + asyncContextRecord.name + "' while record stack is not empty.");
			}
			
			record = new JsProfiler.Record(recordLabel, hasAsyncContext);
			parentRecord = (hasAsyncContext ? asyncContextRecord : this._leafRecord);
			parentRecord.children.push(record);
			this._recordsStack.push(this._leafRecord);
			this._leafRecord = record;
			
			return this._leafRecord;
		},
		
		end: function(recordLabel) {
			
			if (!this._profiling) {
				return;
			}

			if (this._leafRecord.name !== recordLabel) {
				throw new Error("Can't end record '" + recordLabel + "' which was not began, or is not the last record in the stack.");
			}
			
			this._leafRecord.end = Date.now();
			this._leafRecord = this._recordsStack.pop();
		},

		wait: function(recordLabel) {
			// TODO
		},
		
		resume: function(record) {
			// TODO
		},
		
		wrapFunction: function(func, functionName) {
			
			var self = this;
			
			function F() {
				var returnValue;
				self.begin(functionName);
				try {
					returnValue = func.apply(this, arguments);
					self.end(functionName);
					return returnValue;
				} catch (e) {
					self.end(functionName);
					throw e;
				}
			}
			
			return F;
		},
		
		/**
		 * Registers property of an object, which is a function or a getter-setter pair of functions, for being profiled.
		 * This function doesn't registers properties which are non function data descriptors, neither it registers non
		 * own properties. Therefore you can safely call this function on object properties from within for-in loop.
		 * 
		 * The profile data for that property will be denoted with passed objectLabel and propertyName.
		 * For example, if the objectLabel is "myObject" and property is a function "myFunction" then the profile data
		 * for that function will be denoted as "myObject.myFunction()". On the other hand if the property is a setter
		 * and getter function pairs called "myField" then the profile data for that property will be denoted as
		 * "myObject.get myField()" and "myObject.set myField()".
		 * 
		 * If fourth, "onObject", parameter isn't passed, then the new registered property, which is a wrapping function
		 * of the original property, will override the original property. Otherwise the new registered property will be
		 * set on "onObject". This parameter is useful when registering classes. Because when constructor function is
		 * registered, all its class members remain on the original function and not reachable from the registered
		 * constructor. Therefore, iterating over original constructor's own properties and registering them on a new
		 * registered constructor will make class members reachable.
		 * 
		 * @param {Object} object (required) Object with a property to register.
		 * @param {String} propertyName (required) Property name of a property to register.
		 * @param {String} objectLabel (required) Label to be used for denoting profiled property.
		 * @param {Object} [onObject="object"] Object on which to set registered property.
		 *                 If not specified, registered property overrides the original object's property.  
		 */
		registerFunction: function(object, propertyName, objectLabel, onObject) {
			var propertyDescriptor, getter, setter;
			
			propertyDescriptor = Object.getOwnPropertyDescriptor(object, propertyName);
			
			if (typeof propertyDescriptor !== "undefined") {
				if (typeof onObject === "undefined") {
					onObject = object;
				}
				
				if (typeof propertyDescriptor.value !== "undefined") {
					if (typeof propertyDescriptor.value === "function") {
						Object.defineProperty(onObject, propertyName, {
							configurable: propertyDescriptor.configurable,
							enumerable: propertyDescriptor.enumerable,
							writable: propertyDescriptor.writable,
							value: this.wrapFunction(propertyDescriptor.value, objectLabel + "." + propertyName + "()")
						});
					}
				} else if (typeof propertyDescriptor.get === "function" || typeof propertyDescriptor.set === "function") {
					if (typeof propertyDescriptor.get === "function") {
						getter = this.wrapFunction(propertyDescriptor.get, objectLabel + ".get " + propertyName + "()");
					} else {
						getter = propertyDescriptor.get;
					}
					if (typeof propertyDescriptor.set === "function") {
						setter = this.wrapFunction(propertyDescriptor.set, objectLabel + ".set " + propertyName + "()");
					} else {
						setter = propertyDescriptor.set;
					}
					Object.defineProperty(onObject, propertyName, {
						configurable: propertyDescriptor.configurable,
						enumerable: propertyDescriptor.enumerable,
						get: getter,
						set: setter
					});
				}
			}
		},

		/**
		 * Registers all function like properties of an object for being profiled.
		 * Function like properties include functions and getter-setter pairs.
		 * 
		 * @param {Object} object Object to register for profiling.
		 * @param {String} objectLabel Prefix to be used for denoting object's profiled properties.
		 */
		registerObject: function(object, objectLabel) {
			var propertyName;
			
			for (propertyName in object) {
				if (object.hasOwnProperty(propertyName)) {
					this.registerFunction(object, propertyName, objectLabel);
				}
			}
		},

		/**
		 * Registers class constructor and its instance and static functions to be profiled by the profiler.
		 * Registered function include getter-setter pairs.
		 * 
		 * This function doesn't overwrite passed class. It only wraps it and returns the wrapping class.
		 * 
		 * @param {Function} cls Class to be registered
		 * @param {String} className Prefix to be used for denoting object's profiled properties.
		 * @return {Function} Registered class
		 */
		wrapClass: function(cls, className) {
			var newClass, propertyName;
			
			newClass = this.wrapFunction(cls, className + ".constructor()");
			newClass.prototype = cls.prototype;
			newClass.prototype.constructor = newClass;
			
			// Wrapping newClass prototype methods also wraps originalClass prototype methods as they share same prototype object.
			for (propertyName in newClass.prototype) {
				// Wrap only own properties and don't wrap custom defined constructor because we have already wrapped class constructor.
				if (newClass.prototype.hasOwnProperty(propertyName) && propertyName !== "constructor") {
					this.registerFunction(newClass.prototype, propertyName, className);
				}
			}
			
			for (propertyName in cls) {
				if (cls.hasOwnProperty(propertyName)) {
					this.registerFunction(cls, propertyName, className, newClass);
				}
			}
			
			return newClass;
		},

		/**
		 * Registers class constructor and its instance and static functions to be profiled by the profiler.
		 * Registered function include getter-setter pairs.
		 * 
		 * This function overwrites class in context object with new registered class.
		 * 
		 * @param {Object} context Object on which the class is defined.
		 * @param {String} className Name of the class as defined in context.
		 * @return {Function} Registered class.
		 */
		registerClass: function(context, className) {
			context[className] = this.wrapClass(context[className], className);
			return context[className];
		},
		
		getRootRecord: function() {
			return this._recordsStack.length > 0 ? this._recordsStack[0] : this._leafRecord;
		},
		
		getResults: function() {
			var i, resultArray = [];

			/**
			 * @param {JsProfiler.Record} record
			 * @returns {*}
			 */
			function processRecord(record) {
				var result, i, processedChildRecord;

				result = {
					name: record.name,
					async: record.async,
					start: record.start,
					end: record.end,
					total: record.end - record.start,
					self: 0,
					totalChildrenTime: 0,
					durationEnd: record.end,
					duration: 0,
					children: []
				};
				
				for (i = 0; i < record.children.length; i++) {
					processedChildRecord = processRecord(record.children[i]);
					result.children.push(processedChildRecord);
					if (!processedChildRecord.async) {
						result.totalChildrenTime += processedChildRecord.total;
					} else if (processedChildRecord.durationEnd > result.durationEnd) {
						result.durationEnd = processedChildRecord.durationEnd;
					}
				}

				result.self = result.total - result.totalChildrenTime;
				result.duration = result.durationEnd - result.start;

				return result;
			}
			if (this._leafRecord !== null) {
				for (i = 0; i < this._leafRecord.children.length; i++) {
					resultArray.push(processRecord(this._leafRecord.children[i]));
				}
			}
			
			return resultArray;
		}
	};
	
}).apply(window);