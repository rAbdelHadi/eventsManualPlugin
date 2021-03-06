//var moment = require('moment'); MEK TOOK THIS OUT

/*
* Copyright (c) 2010 Rachot Moragraan, City of Garden Grove, CA
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in
* all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
* THE SOFTWARE.
*/


// takes a JSON object with pattern options
function RecurringDate (pattern, date_format) {
    if (typeof pattern != 'object') throw new TypeError('pattern must be a JSON');

    if (!pattern.every) {
        throw new ReferenceError('Every magnitude must be specified');
    }

    if (isNaN(parseInt(pattern.every))) {
        throw new TypeError('Every magnitude must be a valid number');
    }
	
	this.pattern = pattern;

    // stores generated dates based on recurrence pattern
    this.dates = [];

    this.start = this._getDate(pattern.start);
    this.every = parseInt(pattern.every);
    this.unit = pattern.unit;
    this.end_condition = pattern.end_condition;
    //this.until = Date.parse(pattern.until);
    this.until = this._getDate(pattern.until);
    this.rfor = parseInt(pattern.rfor);
    this.occurrence_of = pattern.occurrence_of;
    this.nth = parseInt(pattern.nth);
    this.days = (pattern.days) ? pattern.days.sort() : [];

    this.date_format = date_format || 'MM/DD/YYYY';
}

RecurringDate.prototype._getDate = function(value) {
    var result = moment(value);
    // Handle timezone offsets
    if (this.pattern.timezone) {
        result.zone(this.pattern.timezone);
    }
    return result;
}

// tries to describe the pattern in plain english
RecurringDate.prototype.describe = function () {
    var units = {'d': 'day', 'w': 'week', 'm': 'month', 'y': 'year'};
    var week = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'day'];
    var nthword = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'last']

    var t = ['Every'];
    if (this.every > 2) {
        t.push(this.every, units[this.unit] + 's');
    } else if (this.every == 2) {
        t.push('other', units[this.unit]);
    } else {
        t.push(units[this.unit]);
    }

    if (this.unit == 'w') {
        var d = [];
        for (var i = 0; i < this.days.length; i++) {
            d.push(week[this.days[i]]);
        }
        t.push('on', d.join(', '));
    } else if (this.unit == 'm') {
        // check if it's a special word
        day_idx = (this.occurrence_of < 0) ? week.length - 1 : this.occurrence_of;
        nth_idx = (this.nth < 0) ? nthword.length-1 : this.nth;

        t.push('on the', nthword[nth_idx], week[day_idx]);
    }

    t.push('starting on', this.start.toString(this.date_format));

    if (this.end_condition == 'until') {        
        t.push('until', this._getDate(this.until).format(this.date_format));
    } else if (this.end_condition == 'for') {
        t.push('for', this.rfor, 'occurrences');
    }

    return t.join(' ');
}

// determine whether given date is in recurrence
RecurringDate.prototype.contains = function (d) {
    if (this.dates.length == 0) this.generate();

    // can be string or date object already
    d = this._getDate(d);
	
    for (var i = 0; i < this.dates.length; i++) {
        if (d.diff(this.dates[i], 'days') === 0) return true;
    }
    return false;
}

// returns an array of dates base on input pattern
RecurringDate.prototype.generate = function (max) {
    if (!(this.rfor || this.until || max)) {
        throw new RangeError('There is no valid end condition specified');
    }

    var end_condition_reached = function (occurrences, current_date) {
        if (max && occurrences.length >= max) return true;
        if (this.end_condition == 'for' && this.rfor && occurrences.length >= this.rfor) return true;
        if (this.end_condition == 'until' && this.until && current_date > this.until) return true;
        return false;
    }.bind(this);

    var dates = [];

    var curr = this.start.clone();
    // always include start date in recurrence
    dates.push(curr.clone());

    // weekly recurrence
    if (this.unit == 'w') {
        // if it's not already a sunday, move it to the current week's sunday
        if (!curr.day() === 0) curr.day(0);

        if (this.days.length == 0) {
            throw new RangeError('Weekly recurrence was selected without any days specified.');
            return null;
        }
        while (!end_condition_reached(dates, curr)) {

            // scan through the checked days
            for (var i in this.days) {
                var d = this.days[i];
				
                if (curr.day() < d) curr.day(d);				
                if (curr <= this.start) continue;
                if (end_condition_reached(dates, curr)) continue;

                dates.push(curr.clone());
            }

            // rewind back to sunday
            if (curr.day() !== 0) curr.day(0);
            // next repetition
			curr.add('weeks', this.every);
        }

    } else if (this.unit == 'm') {

        var dateMonth = this.start.date();
        while (true) {
            
            curr.date(dateMonth);
            
            if (end_condition_reached(dates, curr)) break;

            if (curr > this.start) {
                dates.push(curr.clone());
            }

            curr.add('months', this.every);
        }

    } else {
        while (true) {
            if (this.unit == 'd') {
                curr.add('days', this.every);
            } else if (this.unit == 'y') {
                curr.add('years', this.every);
            }
            // else infinite loop yay

            if (end_condition_reached(dates, curr)) break;

            dates.push(curr.clone());
        }
    }

    // cache results
    this.dates = dates;
    return this.dates;
}

//module.exports = RecurringDate;