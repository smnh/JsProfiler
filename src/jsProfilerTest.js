function MyClass() {
	this.foo();
}

function work() {
	var div, offset;
	div = document.createElement("div");
	document.body.appendChild(div);
	offset = div.offsetTop;
	div.parentNode.removeChild(div);

}

MyClass.prototype.foo = function foo() {
	var i;
	this.bar();
	for (i = 0; i < 100; i++) {
		work();
	}
	this.bar();
};

MyClass.prototype.bar = function bar() {
	var i;
	for (i = 0; i < 100; i++) {
		work();
	}
};

var obj = {
	funcA: function funcA() {
		var i;
		for (i = 0; i < 2; i++) {
			this.funcB();
		}
	},
	funcB: function funcB() {
		var i, c;
		for (i = 0; i < 2; i++) {
			c = new MyClass();
			c.bar();
		}
	}
};

function doSomething() {
	var i;
	for (i = 0; i < 3; i++) {
		obj.funcA();
	}
	return false;
}