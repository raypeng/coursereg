function GUID() {
    var S4 = function () {
        return Math.floor(
                Math.random() * 0x10000 /* 65536 */
            ).toString(16);
    };
    return S4() + S4();
}

if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {
        if (typeof this !== "function") {
            // closest thing possible to the ECMAScript 5 internal IsCallable function
            throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
        }
        var aArgs = Array.prototype.slice.call(arguments, 1),
        fToBind = this,
        fNOP = function () { },
        fBound = function () {
            return fToBind.apply(this instanceof fNOP && oThis
            ? this
            : oThis,
            aArgs.concat(Array.prototype.slice.call(arguments)));
        };
        fNOP.prototype = this.prototype;
        fBound.prototype = new fNOP();
        return fBound;
    };
}

if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (searchElement /*, fromIndex */) {
        "use strict";
        if (this === void 0 || this === null) {
            throw new TypeError();
        }
        var t = Object(this);
        var len = t.length >>> 0;
        if (len === 0) {
            return -1;
        }
        var n = 0;
        if (arguments.length > 0) {
            n = Number(arguments[1]);
            if (n !== n) { // shortcut for verifying if it's NaN
                n = 0;
            } else if (n !== 0 && n !== Infinity && n !== -Infinity) {
                n = (n > 0 || -1) * Math.floor(Math.abs(n));
            }
        }
        if (n >= len) {
            return -1;
        }
        var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);
        for (; k < len; k++) {
            if (k in t && t[k] === searchElement) {
                return k;
            }
        }
        return -1;
    }
}

function Calendar(placeholder, parent, name) {
    this.items = {};
    this.placeholder = placeholder;
    this.parent = parent;
    this.name = name;
    this.placeholder.innerHTML = this.getBaseCalendar();
    this.itemSlot = new Array(5);
    this.tempItem = [];

    for (var i = 0; i < 5; i++) {
        this.itemSlot[i] = new Array(32);
        for (var j = 0; j < 32; j++) {
            this.itemSlot[i][j] = new Array();
        }
    }

    $(".timeGrid").width(($(this.placeholder).width() - 40) / 5);
}

// Item has the following properties:
// ID: string
// CourseID: number
// Day: 1 - 5
// StartTime: 1 - 32
// EndTime: 1 - 32
// Name: string
// Location: string
// Campus: string
// HPosition: calculated horizontal position
// Division: calculated horizontal width divition
// Color: color of the item
Calendar.prototype.addItem = function (item) {

    item.UID = GUID();

    // var times = item.Times;
    // parsedTime = times[2 * item.Order + 1];
    // var locations = "";
    // var parsedLocation = "";
    // if (item.Location) {
    //     var locations = item.Location.split(" ");
    //     parsedLocation = locations[item.Order];
    // }

    if (item.Day > 5) return;

    var start_hr = Math.floor((item.StartTime - 1) / 2 + 8).toString();
    if (start_hr.length < 2) {
        start_hr = '0' + start_hr;
    }
    var end_hr = Math.floor((item.EndTime - 1) / 2 + 8).toString();
    if (end_hr.length < 2) {
        end_hr = '0' + end_hr;
    }
    var start_min, end_min;
    if ((item.StartTime - 1) % 2 == 1) {
        start_min = '30';
    } else {
        start_min = '00';
    }
    if ((item.EndTime - 1) % 2 == 1) {
        end_min = '50';
    } else {
        end_min = '20';
    }
    var parsedTime = start_hr + ":" + start_min + " - " + end_hr + ":" + end_min;
    var parsedLocation = item.Location;

    var uid = item.UID;
    this.items[uid] = item;

    for (var i = item.StartTime; i <= item.EndTime; i++) {
        this.itemSlot[item.Day - 1][i].push(item);
    }
    this.refreshDivision(item);
    
    var content = "<div class='calendarItem course" + item.CourseID + " cal" +
        item.ID + "' id='" + item.UID + "'><div class='itemInfo' value='" + item.Day +
        "'><div class='itemInfo-title'>" + item.Abbr + "</div>" +
        parsedTime + "<br>@ " + parsedLocation + "</div></div>";
    $(this.placeholder).find(".calendarContentWrapper").append(content);

    this.resize();

    $("#" + item.UID).hover(function () {
        $(".cal" + item.ID).each(function () {
            $(this).addClass("hover");
        });
    }, function () {
        $(".cal" + item.ID).each(function () {
            $(this).removeClass("hover");
        });
    });

    $("#" + item.UID).click(function (e) {
        $("#listItem" + this.items[$(e.delegateTarget).attr("id")].CourseID).click();
    }.bind(this));
}

Calendar.prototype.removeItem = function (id) {
    var itemsToBeDeleted = $(this.placeholder).find(".cal" + id);
    for (var i = 0; i < itemsToBeDeleted.length; i++) {
        var uid = $(itemsToBeDeleted[i]).attr("id");
        for (var j = this.items[uid].StartTime; j <= this.items[uid].EndTime; j++) {
            var array = this.itemSlot[this.items[uid].Day - 1][j];
            array.splice(array.indexOf(this.items[uid]), 1);
        }
        delete this.items[uid];
    }
    itemsToBeDeleted.remove();
    this.resize();
}

Calendar.prototype.removeCourse = function (courseID) {
    var itemsToBeDeleted = $(this.placeholder).find(".course" + courseID);
    for (var i = 0; i < itemsToBeDeleted.length; i++) {
        var uid = $(itemsToBeDeleted[i]).attr("id");
        for (var j = this.items[uid].StartTime; j <= this.items[uid].EndTime; j++) {
            var array = this.itemSlot[this.items[uid].Day - 1][j];
            array.splice(array.indexOf(this.items[uid]), 1);
        }
        delete this.items[uid];
    }
    itemsToBeDeleted.remove();
    this.resize();
}

Calendar.prototype.getBaseCalendar = function () {
    var content = "<table><tr class='calendarHeader'><td class='name'>" + this.name + "</td><td class='w0 timeGrid'>Mon</td><td class='w1 timeGrid'>Tue</td><td class='w2 timeGrid'>Wed</td><td class='w3 timeGrid'>Thu</td><td class='w4 timeGrid'>Fri</td></tr></table>";
    content += "<div class='calendarContentStatic'><div class='calendarContentWrapper'>";
    content += "<table class='calendarContent'>";
    // 30min for one row, 9am-11pm
    for (var i = 2; i <= 30; i++) {
        content += "<tr class='t" + i + (i % 2 == 0 ? " line" : "") + "'>";
        if (i % 2 == 0) {

            content += "<td class='timeDisplay' rowspan='2'>";
            content += (i / 2 + 8) + ":00";
            content += "</td>";
            for (var j = 0; j < 5; j++) {
                content += "<td class='line'></td>"
            }
        } else {
            for (var j = 0; j < 5; j++) {
                content += "<td></td>"
            }
        }
        content += "</tr>";
    }
    content += "</table></div></div>";
    //content += "</table>";
    return content;
}

Calendar.prototype.refreshDivision = function (item) {
    var maxItems = 0;
    var unavailableSlot = {};
    for (var i = item.StartTime; i <= item.EndTime; i++) {
        var slot = this.itemSlot[item.Day - 1][i];
        var itemCount = 0;
        for (var slotItem in slot) {
            if (slot[slotItem].UID) {
                if (slot[slotItem].UID !== item.UID) {
                    unavailableSlot[slot[slotItem].HPosition] = true;
                    slot[slotItem].Division = slot.length;
                    itemCount++;
                }
            }
        }
        if (itemCount > maxItems) maxItems = itemCount;
    }
    item.Division = maxItems + 1;
    var slot = 0;
    for (var i = 0; i <= maxItems; i++) {
        if (!unavailableSlot[i]) slot = i;
    }
    item.HPosition = slot;
}

Calendar.prototype.resize = function () {

    $(this.placeholder).find(".calendarContentStatic").height($(this.placeholder).height() - 35);
    var timeGrid = $(this.placeholder).find(".timeGrid");

    timeGrid.width(($(this.placeholder).width() - 60) / 5);
    $(this.placeholder).find("td.line").width(($(this.placeholder).width() - 60) / 5);
    $(this.placeholder).find(".timeDisplay").width($(this.placeholder).find(".name").width());
    for (var UID in this.items) {
        var itemObj = $("#" + UID);
        var top = $(this.placeholder).find(".t" + (this.items[UID].StartTime - 1)).position()["top"] - 1;
        var bottom = $(this.placeholder).find(".t" + (this.items[UID].EndTime)).position()["top"];
        var height = bottom - top - 4;
        this.refreshDivision(this.items[UID]);
        var width = (timeGrid.width() - 10) / this.items[UID].Division;
        var dayGrid = $(this.placeholder).find(".w" + (this.items[UID].Day - 1));
        var left = dayGrid.position()["left"] - 2 + (width) * this.items[UID].HPosition;
        itemObj.width(width - 5);
        itemObj.height(height);
        itemObj.css("left", left);
        itemObj.css("top", top);

        // Add conflict color
        if (this.items[UID].Division > 1) {
            itemObj.addClass("conflict");
        } else {
            if (itemObj.hasClass("conflict")) {
                itemObj.removeClass("conflict");
            }
        }
    }
}

Calendar.prototype.isConflicted = function (item) {
    if (item.Day > 5) return false;
    var hasItem = this.hasItem(item);
    for (var i = item.StartTime; i <= item.EndTime; i++) {
        if (this.itemSlot[item.Day - 1][i].length > 0 && !hasItem) return true;
        if (this.itemSlot[item.Day - 1][i].length > 1) return true;
    }
    return false;
}

Calendar.prototype.hasItem = function (item) {
    return $(this.placeholder).find(".cal" + item.ID).length > 0;
}

Calendar.prototype.tempAdd = function (item) {
    this.tempItem.push(item);
    this.addItem(item);
}

Calendar.prototype.tempRemove = function () {
    this.onTempAnimation = false;
    for (var item in this.tempItem) {
        this.removeItem(this.tempItem[item].ID);
    }
    this.tempItem = [];
}

Calendar.prototype.highlight = function (id) {
    $(this.placeholder).children(".highlight").removeClass("highlight");
    $(this.placeholder).children(".course" + id).addClass("highlight");
}

Calendar.prototype.scrollForItem = function (item) {
    if (this.hasItem(item)) {
        var top = $(".cal" + item.ID).position()["top"];
        if ($(this.placeholder).find(".calendarContentStatic").scrollTop() > top || $(this.placeholder).height() + $(this.placeholder).scrollTop() - 40 < top) {
            $(this.placeholder).find(".calendarContentStatic").animate({ scrollTop: top }, 300);
        }
    }
}

Calendar.prototype.getSelectedSlot = function () {
}

Calendar.prototype.getChildItem = function (id) {
    return $(this.placeholder).children(".cal" + id);
}

function CalendarCollection(placeholder, list) {
    this.placeholder = placeholder;
    this.list = list;
    this.split = true;
    $(placeholder).append("<div id='calendarControlBar' class='widgetTitle2'>" +
                          "<div id='downloadcal' class='calendarControls hasTooltip' data-tooltip='Download Calender'>Save My Timetable</div>" +
                          "<div id='uploadcal' class='calendarControls hasTooltip' data-tooltip='Upload Calender'>Load Saved Timetable</div>" +
                          "<div id='uploaddiv'><input type='file' id='fileupload'></div>" +
                          "<div id='downloadical' class='calendarControls hasTooltip' data-tooltip='Save to iCalendar'>Export to Google Calendar or iCalendar</div>" +
                          "<div id='sharecal' class='calendarControls hasTooltip' data-tooltip='Save to iCalendar'>Share Calendar</div>" +
                          "<div id='fallView' class='calendarControls selected'>Fall</div>"
                          + "</div>");
    $(placeholder).append("<div id='fallCalendar' class='singleCalendar'></div>");
    this.fallCalendar = new Calendar($("#fallCalendar")[0], this, "Fall");

    this.resize();

    $("#fallView").click(function () {
        $(this.fallCalendar.placeholder).hide();
        $(".calendarControls.selected").removeClass("selected");
        $("#fallView").addClass("selected");
        $(this.fallCalendar.placeholder).show("slide", 200, function () {
            this.split = false;
            this.resize();
        }.bind(this));
    }.bind(this));

    $("#downloadcal").click(function () {
        ga('send', 'event', 'button', 'click', 'downloadcal', 1);
        var courses = this.getAllSectionsString();
        var time = moment().format();
        var fname = "";
        for (var i = 0; i < time.length; i++) {
            if (time[i] >= "0" && time[i] <= "9") {
                fname = fname + time[i];
            }
        }
        fname = fname.substring(0, 12) + ".cal";
        this.download(courses, fname);
    }.bind(this));

    $("#downloadical").click(function () {
        ga('send', 'event', 'button', 'click', 'downloadical', 1);
        var content = this.ical();
        var time = moment().format();
        var fname = "";
        for (var i = 0; i < time.length; i++) {
            if (time[i] >= "0" && time[i] <= "9") {
                fname = fname + time[i];
            }
        }
        fname = fname.substring(0, 12) + ".ics";
        this.download(content, fname);
    }.bind(this));

    $("#sharecal").click(function () {
        ga('send', 'event', 'button', 'click', 'sharecal', 1);
        var param = encodeURIComponent(this.getAllSectionsString());
        var url = window.location.host;
        var s = url + "/?link=" + param;
        alert("Use this link:   " + s);
    }.bind(this));
}

CalendarCollection.prototype.resize = function () {
    $(this.placeholder).height($("#pageWrapper").height() - 30);
    $(".singleCalendar").height($(this.placeholder).height());
    $(".singleCalendar").width($(this.placeholder).width() - 12);
    this.fallCalendar.resize();
}

CalendarCollection.prototype.addItem = function (item) {
    this.fallCalendar.addItem(item);
}

CalendarCollection.prototype.removeItem = function (id) {
    this.fallCalendar.removeItem(id);
}

CalendarCollection.prototype.tempAdd = function (item) {
    this.fallCalendar.tempAdd(item);
}

CalendarCollection.prototype.tempRemove = function () {
    this.fallCalendar.tempRemove();
}

CalendarCollection.prototype.isConflicted = function (item) {
    if (this.fallCalendar.isConflicted(item)) {
        return true;
    }
    return false;
}

CalendarCollection.prototype.hasItem = function (item) {
    return this.fallCalendar.hasItem(item);
}

CalendarCollection.prototype.highlight = function (id) {
    this.fallCalendar.highlight(id);
}

CalendarCollection.prototype.scrollForItem = function (item) {
    this.fallCalendar.scrollForItem(item);
}

CalendarCollection.prototype.getAllSectionsString = function () {
    var queryString = "";
    var uniqueMap = {};
    $.each((this.fallCalendar.items), function (key, value) {
        if (!uniqueMap[value.ID]) {
            if (queryString !== "") {
                queryString += ",";
            }
            queryString += value.Abbr;
            uniqueMap[value.ID] = value;
        }
    });
    return queryString;
}

CalendarCollection.prototype.removeCourse = function (courseID) {
    this.fallCalendar.removeCourse(courseID);
}

CalendarCollection.prototype.ical = function() {
    var icalentry = function(args) {
        var uid = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
        var location = args.location;
        var title = args.title;
        var stime = args.time.split(" - ")[0];
        var start_time = stime.substring(0, 2) + stime.substring(3, 5) + "00";
        var etime = args.time.split(" - ")[1];
        var end_time = etime.substring(0, 2) + etime.substring(3, 5) + "00";
        var start_day;
        if (args.day == "1") {
            start_day = "20150907";
        } else {
            start_day = "2015090" + (args.day - 1);
        }
        end_day = start_day;
        var s = "BEGIN:VEVENT\nUID:" + uid + "\nDTSTART;TZID=(GMT+8.00)HongKong:" + start_day + "T" +
            start_time + "Z\nDTEND;TZID=(GMT+8.00)HongKong:" + end_day + "T" + end_time +
            "Z\nDTSTAMP:20150815T145735Z\nLOCATION:" + location +
            "\nRRULE:FREQ=WEEKLY;UNTIL=20151130T235959Z\nSUMMARY:" + title + "\nEND:VEVENT\n";
        return s;
    }
    var header = "BEGIN:VCALENDAR\nVERSION:2.0\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\nPRODID:-//hacksw/handcal//NONSGML v1.0//EN\n";
    var result = header;
    var contents = $(".itemInfo").contents();
    var num = contents.length / 4;
    for (var i = 0; i < num; i++) {
        var day = $($(".itemInfo")[i]).attr("value");
        var title = $(contents[4 * i + 0]).text();
        var time = contents[4 * i + 1].data;
        var location = contents[4 * i + 3].data.substring(2);
        var args = { day: day, title: title, time: time, location: location };
        result += icalentry(args);
    }
    result += "END:VCALENDAR\n";
    return result;
}

CalendarCollection.prototype.download = function (text, filename) {
    // http://stackoverflow.com/questions/2897619/using-html5-javascript-to-generate-and-save-a-file#answer-18197511
    if (text === "") {
        return;
    }
    var pom = document.createElement('a');
    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    pom.setAttribute('download', filename);
    
    if (document.createEvent) {
        var event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
    } else {
        pom.click();
    }
}
