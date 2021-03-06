// Instantiate the object
var I18n = I18n || {};

// Set default locale to english
I18n.defaultLocale = "en";

// Set current locale to null
I18n.locale = I18n.locale || null;

I18n.lookup = function(scope, options) {
	var translations = this.prepareOptions(I18n.translations);
	var messages = translations[I18n.currentLocale()];
	options = this.prepareOptions(options);

	if (!messages) {
		return;
	}

	if (typeof(scope) == "object") {
		scope = scope.join(".");
	}

	if (options.scope) {
		scope = options.scope.toString() + "." + scope;
	}

	scope = scope.split(".");

	while (scope.length > 0) {
		var currentScope = scope.shift();
		messages = messages[currentScope];

		if (!messages) {
			break;
		}
	}

	if (!messages && options.defaultValue != null && options.defaultValue != undefined) {
		messages = options.defaultValue;
	}

	return messages;
};

// Merge serveral hash options, checking if value is set before
// overwriting any value. The precedence is from left to right.
//
//   I18n.prepareOptions({name: "John Doe"}, {name: "Mary Doe", role: "user"});
//   #=> {name: "John Doe", role: "user"}
//
I18n.prepareOptions = function() {
	var options = {};
	var opts;
	var count = arguments.length;

	for (var i = 0; i < count; i++) {
		opts = arguments[i];

		if (!opts) {
			continue;
		}

		for (var key in opts) {
			if (options[key] == undefined || options[key] == null) {
				options[key] = opts[key];
			}
		}
	}

	return options;
};

I18n.interpolate = function(message, options) {
	options = options || {};
	var regex = /\{\{(.*?)\}\}/gm;

	var matches = message.match(regex);

	if (!matches) {
		return message;
	}

	var placeholder, value, name;

	for (var i = 0; placeholder = matches[i]; i++) {
		name = placeholder.replace(/\{\{(.*?)\}\}/gm, "$1");

		value = options[name];

		if (options[name] == null || options[name] == undefined) {
			value = "[missing " + placeholder + " value]";
		}

		regex = new RegExp(placeholder.replace(/\{/gm, "\\{").replace(/\}/gm, "\\}"));

		message = message.replace(regex, value);
	}

	return message;
};

I18n.translate = function(scope, options) {
	options = this.prepareOptions(options);
	var translation = this.lookup(scope, options);

	try {
		if (typeof(translation) == "object") {
			if (typeof(options.count) == "number") {
				return this.pluralize(options.count, scope, options);
			} else {
				return translation;
			}
		} else {
			return this.interpolate(translation, options);
		}
	} catch(err) {
		return this.missingTranslation(scope);
	}
};

I18n.localize = function(scope, value) {
	switch (scope) {
		case "currency":
			return this.toCurrency(value);
		case "number":
			scope = this.lookup("number.format");
			return this.toNumber(value, scope);
		default:
			if (scope.match(/^(date|time)/)) {
				return this.toTime(scope, value);
			} else {
				return value.toString();
			}
	}
};

I18n.parseDate = function(d) {
	var matches, date;
	var year, month, day, hour, min, sec = null;

	if (matches = d.toString().match(/(\d{4})-(\d{2})-(\d{2})(?:[ |T](\d{2}):(\d{2}):(\d{2}))?(Z)?/)) {
		// date/time strings: yyyy-mm-dd hh:mm:ss or yyyy-mm-dd or yyyy-mm-ddThh:mm:ssZ
		for (var i = 1; i <= 6; i++) {
			matches[i] = matches[i] == undefined? 0 : parseInt(matches[i], 10);
		}

		// month starts on 0
		matches[2] = matches[2] - 1;

		if (matches[7]) {
		  date = new Date(Date.UTC(matches[1], matches[2], matches[3], matches[4], matches[5], matches[6]));
		} else if (!isNaN(matches[4])) {
		  date = new Date(matches[1], matches[2], matches[3], matches[4], matches[5], matches[6]);
		} else {
		  date = new Date(matches[1], matches[2], matches[3]);
		}
	} else if (typeof(d) == "number") {
		// UNIX timestamp
		date = new Date();
		date.setTime(d);
	} else {
		// an arbitrary javascript string
		date = new Date();
		date.setTime(Date.parse(d));
	}

	return date;
};

I18n.toTime = function(scope, d) {
	var date = this.parseDate(d);
	var format = this.lookup(scope);

	if (date.toString().match(/invalid/i)) {
		return date.toString();
	}

	if (!format) {
		return date.toString();
	}

	return this.strftime(date, format);
};

I18n.strftime = function(date, format) {
	var options = this.lookup("date");

	if (!options) {
		return date.toString();
	}

	var weekDay = date.getDay();
	var day = date.getDate();
	var year = date.getFullYear();
	var month = date.getMonth() + 1;
	var hour = date.getHours();
	var hour12 = hour;
	var meridian = hour > 12? "PM" : "AM";
	var secs = date.getSeconds();
	var mins = date.getMinutes();
	var offset = date.getTimezoneOffset();
	var absOffsetHours = Math.floor(Math.abs(offset / 60));
	var absOffsetMinutes = Math.abs(offset) - (absOffsetHours * 60);
	var timezoneoffset = (offset > 0 ? "-" : "+") + (absOffsetHours.toString().length < 2 ? '0' + absOffsetHours : absOffsetHours) + (absOffsetMinutes.toString().length < 2 ? '0' + absOffsetMinutes : absOffsetMinutes);

	if (hour12 > 12) {
		hour12 = hour12 - 12;
	}

	var padding = function(n) {
		var s = "0" + n.toString();
		return s.substr(s.length - 2);
	};

	var f = format;
	f = f.replace("%a", options["abbr_day_names"][weekDay]);
	f = f.replace("%A", options["day_names"][weekDay]);
	f = f.replace("%b", options["abbr_month_names"][month]);
	f = f.replace("%B", options["month_names"][month]);
	f = f.replace("%d", padding(day));
	f = f.replace("%-d", day);
	f = f.replace("%H", padding(hour));
	f = f.replace("%-H", hour);
	f = f.replace("%I", padding(hour12));
	f = f.replace("%-I", hour12);
	f = f.replace("%m", padding(month));
	f = f.replace("%-m", month);
	f = f.replace("%M", padding(mins));
	f = f.replace("%-M", mins);
	f = f.replace("%p", meridian);
	f = f.replace("%S", padding(secs));
	f = f.replace("%-S", secs);
	f = f.replace("%w", weekDay);
	f = f.replace("%y", padding(year));
	f = f.replace("%-y", padding(year).replace(/^0+/, ""));
	f = f.replace("%Y", year);
	f = f.replace("%z", timezoneoffset);

	return f;
};

I18n.toNumber = function(number, options) {
	options = this.prepareOptions(
		options,
		this.lookup("number.format"),
		{precision: 3, separator: '.', delimiter: ','}
	);

	var string = number.toFixed(options["precision"]).toString();
	var parts = string.split(".");

	number = parts[0];
	var precision = parts[1];

	var n = [];

	while (number.length > 0) {
		n.unshift(number.substr(Math.max(0, number.length - 3), 3));
		number = number.substr(0, number.length -3);
	}

	var formattedNumber = n.join(options["delimiter"]);

	if (options["precision"] > 0) {
		formattedNumber += options["separator"] + parts[1];
	}

	return formattedNumber;
};

I18n.toCurrency = function(number, options) {
	options = this.prepareOptions(
		options,
		this.lookup("number.currency.format"),
		this.lookup("number.format"),
		{ unit: "$", precision: 2, format: "%u%n", delimiter: ",", separator: "." }
	);

	number = this.toNumber(number, options);
	number = options["format"]
				.replace("%u", options["unit"])
				.replace("%n", number);

	return number;
};

I18n.toPercentage = function(number, options) {
	options = this.prepareOptions(
		options,
		this.lookup("number.percentage.format"),
		this.lookup("number.format"),
		{ precision: 3, separator: ".", delimiter: "" }
	);

	number = this.toNumber(number, options);
	return number + "%";
};

I18n.pluralize = function(count, scope, options) {
	var translation = this.lookup(scope, options);

	var message;
	options = options || {};
	options["count"] = count.toString();

	switch(Math.abs(count)) {
		case 0:
			message = translation["zero"] || translation["none"] || translation["other"] || this.missingTranslation(scope, "zero");
			break;
		case 1:
			message = translation["one"] || this.missingTranslation(scope, "one");
			break;
		default:
			message = translation["other"] || this.missingTranslation(scope, "other");
	}

	return this.interpolate(message, options);
};

I18n.missingTranslation = function() {
	var message = '[missing "' + this.currentLocale();
	var count = arguments.length;

	for (var i = 0; i < count; i++) {
		message += "." + arguments[i];
	}

	message += '" translation]';

	return message;
};

I18n.currentLocale = function() {
	return (I18n.locale || I18n.defaultLocale);
};

// shortcuts
I18n.t = I18n.translate;
I18n.l = I18n.localize;
I18n.p = I18n.pluralize;
