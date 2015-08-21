var searchStringTemp = "";
var progSearchStringTemp = "";
var onAnimation = false;
var calendar;
var courseInfo;
var coursesList;
var isSearching;
var courseData;
var all_courses;
var just_reloaded = false;
var load_file = false;
var show_info = false;


function setCaretPosition(elemId, caretPos) {
    var elem = document.getElementById(elemId);

    if (elem != null) {
        if (elem.createTextRange) {
            var range = elem.createTextRange();
            range.move('character', caretPos);
            range.select();
        }
        else {
            if (elem.selectionStart) {
                elem.focus();
                elem.setSelectionRange(caretPos, caretPos);
            }
            else
                elem.focus();
        }
    }
}

function selectAll(id) {
    document.getElementById(id).focus();
    document.getElementById(id).select();
}

$(document).ready(function () {

    $(window).resize(layout);
    // $('#version').html('ver: ' + document.lastModified);

    coursesList = new CoursesList(document.getElementById("addedCoursesList"));
    calendar = new CalendarCollection(document.getElementById("calendarViews"), coursesList);

    $("#searchBox").val("");
    $("#searchBox").keydown(function () {
        $('#courseInfo').hide();
        if ($(this).hasClass("searchTip")) {
            $(this).val("");
            $(this).removeClass("searchTip");
        }
    });
    $("#searchBox").keyup(function () {
        $('#courseInfo').hide();
        searchStringTemp = $("#searchBox").val();
        setTimeout(function () {
            if ($("#searchBox").val() === searchStringTemp) {
                searchCourse(searchStringTemp);
            }
        }, 300);
    });
    $("#searchBox").focus(function () {
        if (!$(this).hasClass("searchTip")) {
            selectAll("searchBox");
        }

        if ($(".matchCollection").length > 0) {
            $("#resultViewWrapper").show("blind", 100);
        }
    });

    $("#searchBox").focus();
    $("#searchBox").addClass("searchTip");
    setCaretPosition("searchBox", 0);

    requirejs.config({
        paths: {
            "text": "js/text",
            "json": "js/json",
            "moment": "js/moment",
        }
    });
    require(['json!js/new.json'], function(data){
        courseData = data; // data need to be loaded first

        var link = getUrlParameters()["link"];
        if (link) {
            link = decodeURIComponent(link);
            console.log("link: " + link);
            readStringAddCourse(link);
        } else {
            readCookieAddCourse();
        }

        just_reloaded = false;
    });
    define(["moment"], function (moment) {
        moment().format();
    });

    $(document).click(function (e) {
        if ($(e.target).attr("id") !== "courseInfo"
            && $(e.target).parents("#courseInfo").length == 0) {
            if ($(e.target).parents("#sideBar").length == 0) {
                if (!$(e.target).hasClass("calendarItem")
                    && $(e.target).parents(".calendarItem").length == 0) {
                    $("#courseInfo").hide("slide", 100);
                    $("#resultViewWrapper").hide("blind", 100);
                    $(".courseResult.selected").removeClass("selected");
                    $("#courseList").children(".selected").removeClass("selected");
                    $(".highlight").removeClass("highlight");
                }
            }
        }
    });

    $(".options").click(function () {
        if ($("#searchBox").val().length > 1) {
            searchCourse($("#searchBox").val());
        }
        searchProgram($("#programSearchBox").val());
    });

    $("#uploadcal").off().click(function() {
        load_file = true;
        $("#fileupload").click();
        ga('send', 'event', 'button', 'click', 'uploadcal', 1);
    });

    $("#fileupload").change(function() {
        if (!window.FileReader) {
            alert('Your browser is not supported');
            return false;
        }
        var input = $("#fileupload").get(0);

        // Create a reader object
        var reader = new FileReader();
        if (input.files.length) {
            var textFile = input.files[0];
            // Read the file
            reader.readAsText(textFile);
            // When it's loaded, process it
            $(reader).on('load', processFile);
        } else {
            alert('Please upload a file before continuing')
        }
    });

    $("#fork-me").click(function() {
        ga('send', 'event', 'button', 'click', 'fork', 1);
    });

    layout();

    function processFile(e) {
        var file = e.target.result,
        results;
        just_reloaded = true;
        if (file && file.length && load_file) {
            var courses = file;
            console.log("file: " + courses);
            readStringAddCourse(courses);
            load_file = false;
        }
        just_reloaded = false;
    }

    function layout() {
        // $("#pageWrapper").height($(window).height() - 85);
        // $("#searchBox").width($("#sideBar").width() - 80);
        // $("#resultView").css("min-width", $("#searchBox").width());
        // $("#calendarViews").width($(window).width() - $("#sideBar").width() - 32);
        // $("#calendarViews").height($(window).height() - 90);
        // $("#sideBar").height($("#calendarViews").height());
        // $("#courseList").height($("#sideBar").height() - 68);

        if (calendar) {
            calendar.resize();
        }
    }

    function searchCourseJSON(query) {
        var courseDataString = {};
        Object.keys(courseData).map(function(k) {
            courseDataString[k] = JSON.stringify(courseData[k]);
        });
        var resultString = "";
        var ks = Object.keys(courseData);

        query = query.trim().toLowerCase();
        var already = [];
        var match = Array.apply(null, Array(2000)).map(function (_, i) {return i.toString();});
        var keywords = query.trim().split(" ");

        for (var ki in keywords) {
            var k = keywords[ki];
            
            already = [];

            // search match in course code
            for (var i in ks) {
                var ii = ks[i];
                if (already.indexOf(ii) == -1 &&
                    courseData[ii]['Abbr'].toLowerCase().indexOf(k) > -1) {
                    already.push(ii);
                }
            }

            // search match in course title
            for (var i in ks) {
                var ii = ks[i];
                if (already.indexOf(ii) == -1 &&
                    courseData[ii]['Name'].toLowerCase().indexOf(k) > -1) {
                    already.push(ii);
                }
            }

            // search match in instructor
            for (var i in ks) {
                var ii = ks[i];
                var sections = courseData[ii].Sections;
                for (var si in sections) {
                    var s = sections[si];
                    if (already.indexOf(ii) == -1 &&
                        s.Instructor.toLowerCase().indexOf(k) > -1) {
                        already.push(ii);
                    }
                }
            }

            // intersect all results
            match = already.filter(function(v) { 
                return match.indexOf(v) > -1;
            });

        }

        for (var i in match) {
            var ii = match[i];
            var s = "<li id='c" + courseData[ii]["ID"].toString() + "' class='courseResult'>" + courseData[ii]["Abbr"] + ": " + courseData[ii]["Name"] + "</li>";
            resultString += s;
        }
        return resultString;
    }

    function searchCourse(query) {
        show_info = true;
        if ($("#searchBox").hasClass("searchTip")) {
            $("#searchBox").removeClass("searchTip");
        }

        query = query.replace("(", " ").replace(")", " ");

        if (query.length > 1) {
            loadingOn($("#courseWrapper"));
            result = searchCourseJSON(query);
            new ResultView($("#resultView")[0], result);
            // if (result.length > 0) {
            //     $('#courseInfo').html("");
            //     $('#courseInfo').show();
            // }
            loadingOff();
        } else {
            new ResultView($("#resultView")[0], "");
            $('#courseInfo').html("");
            $('#courseInfo').hide();
        }
    }

    function searchCourseCode(object) {
        var query = $(object).text();
        $("#searchBox").val(query);
        searchCourse(query);
    }

    function searchCourseInfo(id, target) {
        var course = courseData[id.substring(1)];
        courseInfo = new CourseInfo($("#courseInfo"), course, target);
    }

    function searchCourseSection(code, section) {
        if (all_courses === undefined) {
            var ids = Object.keys(courseData);
            all_courses = ids.map(function(id) { return courseData[id]; });
        }
        var course = all_courses.filter(function(c) { return c['Abbr'] === code; })[0];
        var courseInfo = new CourseInfo($('#courseInfo'), course, '#dummy');
        var sids = Object.keys(course.Sections);
        var section_id = sids.filter(function(i) { return course.Sections[i]['Name'] === section; });
        courseInfo.addSection(section_id, true);
    }

    function searchCourseCodeCallback(code, callback) {
        // disabled add course by cookie
        // $.getJSON("http://griddy.org/api/course?raw=true&q=code:" + code, callback);
    }

    // Note no 'c' in front of the course id
    function searchCourseInfoCallback(id, callback) {
        // $.getJSON("http://griddy.org/api/course?id=" + id, callback);
    }

    function loadingOn(item) {
        $(".loading").remove();
        item.append("<img class='loading' src='images/ajax-loader.gif' style='float:right;'/>")
    }

    function loadingOff() {
        $(".loading").remove();
    }

    // ResultView object
    function ResultView(placeholder, result) {
        this.placeholder = placeholder;
        this.result = result;
        this.formatElements(placeholder, result);
        $(this.placeholder).parent().show("blind", 100);
    }

    ResultView.prototype.formatElements = function (placeholder, result) {
        $(placeholder).html("");

        function addCollection(collection, name, title, collapsed) {
            if (collection) {
                $(placeholder).append("<div class='matchCollection" + (collapsed ? " collapsed" : "") + "' id='" + name + "'></div>");
                new MatchCollection($("#" + name), title, collection);
            }
        }

        addCollection(result, "codeNameMatches", "", false);

        $(".matchCollection.collapsed").height(20);
    }

    // ResultView > MatchCollection object
    function MatchCollection(placeholder, name, collection) {
        this.placeholder = placeholder;
        var content = "";
        if (name !== "") {
            content += "<div class='matchCollectionTitle'>" + name + "</div>";
        }

        content += "<ul>" + collection + "</ul>";
        $(this.placeholder).html(content);
        $(this.placeholder).children(".matchCollectionTitle").click(this.onTitleClick);
        $(this.placeholder).children("ul").children(".courseResult").click(function (e) {
            searchCourseInfo($(e.target).attr("id"), $(e.target));
            $(".courseResult.selected").removeClass("selected");
            $(this).addClass("selected");
        });
    }

    MatchCollection.prototype.onTitleClick = function (e) {
        var target = $(e.target);
        var placeholder = target.parent();
        var parent = placeholder.parent();

        if (placeholder.hasClass("collapsed")) {
            var onAnimation = true;
            placeholder.animate({ height: target.next().children().length * 24 + 20 }, 200, function () {

                var scrollTop = parent.scrollTop();
                var top = target.position()["top"];

                if (placeholder.height() > parent.height()) {
                    parent.scrollTop(scrollTop + top - 80);
                } else {
                    parent.scrollTop(scrollTop + top - parent.height() + placeholder.height());
                }
            });
            placeholder.removeClass("collapsed");
        } else {
            placeholder.animate({ height: 20 }, 200);
            placeholder.addClass("collapsed");
        }
    }

    // CourseInfo object
    function CourseInfo(placeholder, course, alignment) {
        this.course = course;
        this.placeholder = placeholder;
        this.animationLock = false;

        $(this.placeholder).html(this.getHtml(this.course));
        $(this.placeholder).css("left", $(alignment).offset()["left"] + $(alignment)[0].outerWidth + 20);
        var top = $(alignment).offset()["top"];
        $(this.placeholder).css("top", top);

        $(".section").hover(function (e) {
            this.fade();
            courseInfo.addSection($(e.delegateTarget).attr("order"), false);
        }.bind(this), function () {
            calendar.tempRemove();
            //this.notFade();
        }.bind(this));

        $(".sectionDiv").hover(function () {
            this.fade();
        }.bind(this), function () {
            this.notFade();
        }.bind(this));

        $(".section").click(function () {
            if ($(this).hasClass("added")) {
                courseInfo.removeSection($(this).attr("order"));
            } else {
                courseInfo.addSection($(this).attr("order"), true);
            }
        });
        this.refreshConflict();
    }

    CourseInfo.prototype.fade = function () {
        $(this.placeholder).css("background-color", "transparent");
        $(this.placeholder).css("border-color", "transparent");
        $(this.placeholder).children(".wrapper").css("overflow-y", "hidden");
        $(this.placeholder).children(".wrapper").children().css("opacity", "0.0");
        $(".sectionDiv").css("opacity", "0.8");
        $(".sectionDiv").css("background-color", "white");
    }

    CourseInfo.prototype.notFade = function () {
        $(this.placeholder).css("background-color", "white");
        $(this.placeholder).children(".wrapper").css("overflow-y", "auto");
        $(this.placeholder).children(".wrapper").children().css("opacity", "1.0");
        $(this.placeholder).css("border-color", "#ddd");
        $(".sectionDiv").css("opacity", "1.0");
    }

    CourseInfo.prototype.getHtml = function (course) {
        if (just_reloaded) {
            return;
        }

        this.notFade();
        $(this.placeholder).hide();
        var content;
        content = "<div class='wrapper'><div id='courseInfoTitle'><b>" + course.Abbr + ": " + course.Name + "</b></div>";
        if (course.Description) {
            content += "<div class='courseInfoDescription'>" + course.Description + "</div>";
        }

        // Add matching hint
        if (course.Matching) {
            content += "<div id='courseInfoMathingSections'><b>Matching between Lecture & Tutorial Required</b></div>";
        }

        // Add lecture sections
        content += "<div class='sectionDiv'><div id='courseInfoLectureSections'><b>Lectures: </b>";
        for (var i = 0; i < course.Sections.length; i++) {
            if (course.Sections[i].IsLecture) {
                content += "<div class='section' order=" + i + ">"
                    + course.Sections[i].Name + "</div>";
            }
        }
        content += "</div>";

        // Add tutorial sections
        content += "<div id='courseInfoTutorialSections'><b>Tutorials: </b>";
        for (var i = 0; i < course.Sections.length; i++) {
            if (!course.Sections[i].IsLecture && course.Sections[i].Name[0] === "T") {
                var item = this.getSectionObject(i, 0);
                content += "<div class='section' order=" + i + ">"
                    + course.Sections[i].Name + "</div>";
            }
        }
        content += "</div>";

        // Add lab sections
        content += "<div id='courseInfoLabSections'><b>Labs: </b>";
        for (var i = 0; i < course.Sections.length; i++) {
            if (!course.Sections[i].IsLecture && course.Sections[i].Name[0] === "L") {
                var item = this.getSectionObject(i, 0);
                content += "<div class='section' order=" + i + ">"
                    + course.Sections[i].Name + "</div>";
            }
        }
        content += "</div>";

        // Add instructors
        content += "<div class='courseInfoDescription'><b>Instructor: </b>";
        for (var i = 0; i < course.Sections.length; i++) {
            if (course.Sections[i].Instructor !== "") {
                content += course.Sections[i].Instructor + " (" + course.Sections[i].Name + ") ";
            }
        }
        content += "</div>";

        if (course.Prerequisites.length > 0) {
            content += "<div class='courseInfoDescription'><b>Prerequisites: </b>" + course.Prerequisites + "</div>";
        }
        if (course.Corequisites.length > 0) {
            content += "<div class='courseInfoDescription'><b>Corequisites: </b>" + course.Corequisites + "</div>";
        }
        if (course.Exclusions.length > 0) {
            content += "<div class='courseInfoDescription'><b>Exclusions: </b>" + course.Exclusions + "</div>";
        }
        content += "</div>";

        if (show_info) {
            setTimeout(function () {
                $(this.placeholder).show("slide", 100);
            }.bind(this), 100);
        }

        return content;

    }

    CourseInfo.prototype.addSection = function (i, permanent) {
        if (permanent) {
            this.notFade();
        }
        // Avoid duplicate
        if (permanent) {
            calendar.tempRemove();
        }
        if ($(".cal" + this.course.ID + this.course.Sections[i].Name).length > 0) return;

        var meetTimes = this.course.Sections[i].ParsedTime.MeetTimes;
        var ID = this.course.ID + this.course.Sections[i].Name;

        // Earliest time to scroll the calendar
        if (meetTimes) {

            var earliestTime = this.getSectionObject(i, 0, ID);

            for (var j = 0; j < meetTimes.length; j++) {
                var item = this.getSectionObject(i, j, ID);

                // Record earliest time
                if (item.StartTime < earliestTime.StartTime) {
                    earliestTime = item;
                }

                // Add to calendar
                if (permanent) {
                    calendar.addItem(item);
                    coursesList.addItem(item);
                    refreshCookie();
                } else {
                    calendar.tempAdd(item);
                }
            }

            // Animate the scrollbar
            setTimeout(function () {
                calendar.scrollForItem(earliestTime);
            }, 300);
        }
        if (permanent) {
            this.refreshConflict();
        }
    }

    CourseInfo.prototype.removeSection = function (i) {
        this.notFade();
        if ($(".cal" + this.course.ID + this.course.Sections[i].Name).length == 0) return;
        var id = this.course.ID + this.course.Sections[i].Name;
        calendar.removeItem(id);
        coursesList.removeItem(id);
        refreshCookie();
    }

    CourseInfo.prototype.getSectionObject = function (i, j, ID) {
        return getSectionObject(this.course, i, j, ID);
    }

    function getSectionObject(course, i, j, ID) {
        var meetTimes = course.Sections[i].ParsedTime.MeetTimes;
        var item = {};
        item.Abbr = course.Abbr + " " + course.Sections[i].Name;
        item.Name = course.Abbr + ": " + course.Name + " " + course.Sections[i].Name,
        item.ShortName = course.Abbr + ": " + course.Name;
        item.SectionName = course.Sections[i].Name;
        item.ID = ID;
        item.CourseID = course.ID;
        item.Credits = course.Credits;
        item.Location = course.Sections[i].Location;
        item.Matching = course.Matching;

        if (meetTimes) {
            if (meetTimes[j]) {
                item.Day = meetTimes[j].Day;
                item.StartTime = meetTimes[j].StartTime;
                item.EndTime = meetTimes[j].EndTime;
            }
        }

        item.Order = j;
        return item;
    }

    CourseInfo.prototype.refreshConflict = function () {
        $sections = $(".section");
        for (var i = 0; i < $sections.length; i++) {
            var order = $($sections[i]).attr("order");
            var section = this.course.Sections[order];
            if (section.ParsedTime.MeetTimes) {

                var conflict = false;
                var added = false;

                for (var j = 0; j < section.ParsedTime.MeetTimes.length; j++) {
                    var item = this.getSectionObject(order, j, this.course.ID + section.Name);

                    if (calendar.isConflicted(item)) {
                        conflict = true;
                    }

                    if (calendar.hasItem(item)) {
                        added = true;
                    }

                }

                if (added && !$($sections[i]).hasClass("added")) {
                    $($sections[i]).addClass("added");
                } else if (!added && $($sections[i]).hasClass("added")) {
                    $($sections[i]).removeClass("added");
                }

                if (conflict && !$($sections[i]).hasClass("conflict")) {
                    $($sections[i]).addClass("conflict");
                } else if (!conflict && $($sections[i]).hasClass("conflict")) {
                    $($sections[i]).removeClass("conflict");
                }
            }
        }
    }

    /* Method to Parse Url Parameters */
    function getUrlParameters() {
        var urlParams = {};
        var e,
        a = /\+/g,  // Regex for replacing addition symbol with a space
        r = /([^&=]+)=?([^&]*)/g,
        d = function (s) { return decodeURIComponent(s.replace(a, " ")); },
        q = window.location.search.substring(1);

        while (e = r.exec(q))
            urlParams[d(e[1])] = d(e[2]);

        return urlParams;
    }

    function CoursesList(placeholder) {
        this.placeholder = placeholder;
        $(this.placeholder).append("<div id='coursesListTitle' class='widgetTitle'></div><div id='courseList'></div>");
        this.items = {};
        this.courses = {};
        this.creditCount = 0;
        this.courseCount = 0;

    }

    CoursesList.prototype.removeCourse = function (courseID) {
        calendar.removeCourse(courseID);
        delete this.courses[courseID];
        this.refreshCredit();
        this.refreshHtml();
        if (courseInfo) {
            courseInfo.refreshConflict();
        }
        refreshCookie();
    }

    CoursesList.prototype.addItem = function (item) {
        if ($("#list" + item.ID).length == 0) {
            var id = item.ID;

            // if already have this course
            if (!this.courses[item.CourseID]) {
                this.courses[item.CourseID] = {};
                this.courses[item.CourseID].Items = {};
                this.courses[item.CourseID].Items[id] = item;
                this.courses[item.CourseID].Credits = item.Credits;
                this.refreshHtml();

                this.refreshCredit();
            } else {
                this.courses[item.CourseID].Items[id] = item;
                this.refreshHtml();
            }
        }
    }

    CoursesList.prototype.refreshCredit = function () {
        this.creditCount = 0;
        this.courseCount = 0;
        for (var courseId in this.courses) {
            this.creditCount += this.courses[courseId].Credits;
            this.courseCount++;
        }
        if (this.creditCount === 0) {
            $("#coursesListTitle").html("");
        } else {
            $("#coursesListTitle").html(this.courseCount + " course" + (this.courseCount == 1 ? "" : "s") + " added. Totally " + this.creditCount + " credit" + (this.creditCount <= 1 ? "." : "s."));
        }
    }

    CoursesList.prototype.getHtml = function (item) {
        var content = "<li id='list" + item.ID + "'><div class='listItem'>" + item.Abbr + "</div><div class='listItem-delete'>Delete</div></li>";
        return content;
    }

    CoursesList.prototype.refreshHtml = function () {
        var courseList = $(this.placeholder).children("#courseList");
        courseList.html("");
        for (var courseId in this.courses) {
            for (var first in this.courses[courseId].Items) break;

            var sectionString = "";
            for (var each in this.courses[courseId].Items) {
                if (sectionString === "") {
                    sectionString += this.courses[courseId].Items[each].SectionName;
                } else {
                    sectionString += ", " + this.courses[courseId].Items[each].SectionName;
                }
            }

            sectionString = "Sections: " + sectionString;

            var item = this.courses[courseId].Items[first];
            courseList.append(
                $("<div class='listItem' id='listItem" + item.CourseID + "'></div>")
                    .data("id", item.CourseID)
                    .html(
                        "<div class='listItem-title'>" + item.ShortName + "</div><div class='listItem-delete'>Delete</div><div class='listItem-sections'>" + sectionString + "</div>"
                    ));
        }

        // $(".listItem").on("mouseenter", function (e) {
        $(".listItem").on("mouseover", function (e) {
            $(this).find(".listItem-delete").show();
        });

        $(".listItem-delete").on("click", function (e) {
            this.removeCourse($(e.target).parent().data("id"));
        }.bind(this));

        $(".listItem").on("mouseleave", function (e) {
            $(this).find(".listItem-delete").hide();
        });

        $(".listItem").on("click", function (e) {
            show_info = true;
            if (!$(e.target).hasClass("listItem-delete")) {
                if (!$(this).hasClass("selected")) {
                    searchCourseInfo("c" + $(this).data("id"), this);
                    $(this).parent().children(".selected").removeClass("selected");
                    $(this).addClass("selected");
                    calendar.highlight($(this).data("id"));
                } else {
                    //$(this).removeClass("selected");
                    $(document).click();
                }
            }
        });
    }

    CoursesList.prototype.removeItem = function (ID) {
        calendar.removeItem(ID);
        if (courseInfo) {
            courseInfo.refreshConflict();
        }
        refreshCookie();
        var regex = /([0-9]+)([A-Z]+[0-9]+)/;
        var match = regex.exec(ID);
        if (match) {
            var courseId = match[1];
            if (this.courses[courseId]) {
                delete this.courses[courseId].Items[ID];
                for (var item in this.courses[courseId].Items) break;
                if (!item) {
                    delete this.courses[courseId];
                }
            }
        }
        this.refreshHtml();
        this.refreshCredit();
    }

    function setCookie(c_name, value, exdays) {
        var exdate = new Date();
        exdate.setDate(exdate.getDate() + exdays);
        var c_value = escape(value) + ((exdays == null) ? "" : "; expires=" + exdate.toUTCString());
        document.cookie = c_name + "=" + c_value;
    }

    function getCookie(c_name) {
        var i, x, y, ARRcookies = document.cookie.split(";");
        for (i = 0; i < ARRcookies.length; i++) {
            x = ARRcookies[i].substr(0, ARRcookies[i].indexOf("="));
            y = ARRcookies[i].substr(ARRcookies[i].indexOf("=") + 1);
            x = x.replace(/^\s+|\s+$/g, "");
            if (x == c_name) {
                return unescape(y);
            }
        }
    }

    function readCookieAddCourse() {
        var queryString = getCookie("AddedCourses");
        console.log("cookie: " + queryString);
        if (queryString && queryString !== "") {
            just_reloaded = true;
            readStringAddCourse(queryString);
        }
    }

    function readStringAddCourse(courses) {
        courses = courses.split(",");
        courses.forEach(function(c) {
            var d = c.split(" ");
            var code = d[0];
            var section = d[1];
            searchCourseSection(code, section);
        });
    }

    function refreshCookie() {
        setCookie("AddedCourses", calendar.getAllSectionsString(), 100);
    }

});
