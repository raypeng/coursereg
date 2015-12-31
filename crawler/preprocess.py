# -*- coding: utf-8 -*-
import re
import sys
import json
import time
import urllib2
from operator import add
from itertools import product


INDEX = 'https://w5.ab.ust.hk/wcq/cgi-bin/1520/'
GLOBAL_ID = 1


class ForgetAboutThisCourse(Exception):
    pass


def replace_dict(s, d):
    for key, val in d.iteritems():
        s = s.replace(key, str(val))
    return s


def map_time(s):
    ''' input ~ 'TuTh 09:00AM - 10:20AM'
    '''
    time_regex = re.compile(r'^(?:Mo|Tu|We|Th|Fr|Sa|Su)+\s*[\d]{2}:' + \
                            r'[\d]{2}A?P?M\s*-\s*[\d]{2}:[\d]{2}A?P?M$')
    if not re.match(time_regex, s.strip()): # invalid time (too complex)
        raise TimeTooComplexException
    day_map = {'Mo': 1, 'Tu': 2, 'We': 3, 'Th': 4, 'Fr': 5, 'Sa': 6, 'Su': 7}
    time_replace = {'12:20': '12:30', '12:50': '01:00',
                    '01:20': '01:30', '01:50': '02:00',
                    '02:20': '02:30', '02:50': '03:00',
                    '03:20': '03:30', '03:50': '04:00',
                    '04:20': '04:30', '04:50': '05:00',
                    '05:20': '05:30', '05:50': '06:00',
                    '06:20': '06:30', '06:50': '07:00',
                    '07:20': '07:30', '07:50': '08:00',
                    '08:20': '08:30', '08:50': '09:00',
                    '09:20': '09:30', '09:50': '10:00',
                    '10:20': '10:30', '10:50': '11:00',
                    '11:20': '11:30', '11:50AM': '12:00PM'}
    time_map = {'08:00AM': 1,  '08:30AM': 2,  '09:00AM': 3,  '09:30AM': 4,
		'10:00AM': 5,  '10:30AM': 6,  '11:00AM': 7,  '11:30AM': 8,
                '12:00PM': 9,  '12:30PM': 10, '01:00PM': 11, '01:30PM': 12,
                '02:00PM': 13, '02:30PM': 14, '03:00PM': 15, '03:30PM': 16,
                '04:00PM': 17, '04:30PM': 18, '05:00PM': 19, '05:30PM': 20,
                '06:00PM': 21, '06:30PM': 22, '07:00PM': 23, '07:30PM': 24,
                '08:00PM': 25, '08:30PM': 26, '09:00PM': 27, '09:30PM': 28,
                '10:00PM': 29, '10:30PM': 30, '11:00PM': 31, '11:30PM': 32}
    day, time = tuple(s.split(' ', 1))
    day_list = [int(char) for char in replace_dict(day, day_map)]
    time_str = replace_dict(replace_dict(time, time_replace), time_map)
    lower, upper = tuple(map(int, time_str.split(' - ')))
    time = [map(lambda x: x + 100 * d, range(lower, upper)) for d in day_list]
    return [tt for t in time for tt in t]


def split_time(time_array):
    '''
    input ~ [109, 110, 111, 309, 310, 311]
    output ~ [{'Day': 1, 'StartTime': 9, 'EndTime': 10},
              {'Day': 3, 'StartTime': 9, 'EndTime': 10}]
    '''
    time_array = sorted(time_array)
    splited = []
    discontinued_idx = []
    for i in range(len(time_array) - 1):
        if time_array[i] + 1 != time_array[i + 1]:
            discontinued_idx.append(i)
    discontinued_idx.append(len(time_array) - 1)
    prev = -1
    for idx in discontinued_idx:
        splited.append(time_array[0:idx - prev])
        time_array = time_array[idx - prev:]
        prev = idx
    if splited == [[]]:
        raise ForgetAboutThisCourse
    output = map(lambda l: {'Day': l[0] / 100,
                            'StartTime': l[0] % 100,
                            'EndTime': l[-1] % 100},
                 splited)
    return output

    
def arrange_sessions(dt):
    '''
    input ~
    {'L1': {'loc': 'G007, LSK Bldg (80)', 'tutor': 'CHAN, Dennis Suk Sun', 
    'time': [109, 110, 111, 309, 310, 311]}}
    output ~
    [{'ParsedTime': {'MeetTimes': [{'Day': 1, 'StartTime': 9, 'EndTime': 11},
    {'Day': 3, 'StartTime': 9, 'EndTime': 10}]}, 'Instructor':
    'CHAN, Dennis Suk Sun', 'Location': 'G007, LSK Bldg (80)', 'Name': 'L1',
    'IsLecture': true}]
    '''
    sessions = []
    for name in dt:
        session = {}
        session['Name'] = name
        session['Location'] = dt[name]['loc']
        session['Instructor'] = dt[name]['tutor']
        session['IsLecture'] = name[0] == 'L' and name[1] != 'A'
        session['ParsedTime'] = {'MeetTimes': split_time(dt[name]['time'])}
        sessions.append(session)
    return sorted(sessions, key=lambda s: s['Name'])
           

def parse_sessions(s):
    '''
    input ~ html
    output ~ see parse_course 'Sections'
    '''
    titles = [re.search(r'([\w ]{0,8})\(\d{4}\)', ss).group(1).strip()
              for ss in re.findall(r'[\w ]{0,8}\(\d{4}\)', s)]
    td = re.split(r'[\w ]{0,8}\(\d{4}\)', s)[1:]
    tds = map(lambda s: re.findall(r'<td>.*?</td>', s)[:3], td)
    time_regex = re.compile(r'(?:Mo|Tu|We|Th|Fr|Sa|Su)+\s*[\d]{2}:' + \
                            r'[\d]{2}A?P?M\s*-\s*[\d]{2}:[\d]{2}A?P?M')
    times = [reduce(add, map(map_time, re.findall(time_regex, t)), [])
             for t in td]
    times = [sorted(list(set(time))) for time in times] # trick
    for time in times:
        for t in time:
            if t >= 600: # Sa Su
                return [] # meaning ForgetAboutThisCourse
    tutors = map(lambda s: s[s.index('>')+1:s.index('<', 2)]
                 if '<a' in s else s,
                 [re.search(r'<td>(.*?)</td>', d[2]).group(1) for d in tds])
    try:
        details = [{'time': times.pop(0),
                    'loc': re.search(r'<td>(.*?)</td>', d[1]).group(1),
                    'tutor': tutors.pop(0)}
                   for d in tds]
        dt = dict(zip(titles, details))
        sessions = arrange_sessions(dt)
    except (ForgetAboutThisCourse, AttributeError) as e:
        sessions = []
    return sessions
    

def parse_course(s):
    ''' 
    input ~ html
    output ~
    {"Abbr": "PHYS1003", "Corequisites": "", "ID": 123,
    "Description": "some easy course", "Exclusions": "PHYS1001",
    "Name": "Env Physics", "Prerequisites": "", "Credits": 3, 
    "Matching": false,
    "Sections": [{ "Instructor": "gg", "Location": "LTA", "Name": "L1", 
    "ParsedTime": { "MeetTimes": [111, 112, 113] } }, { "Instructor": "ray",
    "Location": "LTC", "Name": "L2", "ParsedTime": { "MeetTimes":
    [122, 123, 128] } }]}
    '''
    intro = re.search(r'(?<=<h2>)(?P<Abbr>.*?) - (?P<Name>.*) ' \
               + r'\((?P<Credits>[\d+.]*\d+) unit[s]*\)(?=</h2>)', s)
    info = intro.groupdict()
    info['Abbr'] = ''.join(info['Abbr'].split(' '))
    print info['Abbr'],
    info['Credits'] = float(info['Credits'])
    info['Name'] = info['Name'].replace("'", ' ')
    info['Matching'] = '<div class="matching">' in s

    ex = re.search(r'<th>EXCLUSION</th><td>(.*?)</td>', s)
    info['Exclusions'] = ex.group(1) if ex else ''
    pre = re.search(r'<th>PRE-REQUISITE</th><td>(.*?)</td>', s)
    info['Prerequisites'] = pre.group(1) if pre else ''
    co = re.search(r'<th>CO-REQUISITE</th><td>(.*?)</td>', s)
    info['Corequisites'] = co.group(1) if co else ''
    desc = re.search(r'<th>DESCRIPTION</th><td>(.*?)</td>', s)
    info['Description'] = desc.group(1) if desc else ''

    global GLOBAL_ID
    info['ID'] = GLOBAL_ID
    GLOBAL_ID += 1

    sessions_info = parse_sessions(s)
    if sessions_info: # ecluding not meaningful courses
        info['Sections'] = sessions_info
        print
        return { info['ID']: info }
    else:
        print 'fail'
        return {}


def parse_url(index_url):
    response = urllib2.urlopen(index_url)
    html = response.read()
    depts_match = re.search(r'(?<=<div class="depts">).*(?=</div>)', html)
    depts = re.findall(r'(?<=">)\w{4}(?=</a>)', depts_match.group())
    catalog = {}
    for dept in depts:
        print 'reading course titles', dept
        dept_url = index_url + 'subject/' + dept
        response = urllib2.urlopen(dept_url)
        html = response.read()
        data = html.split('<script type="text/javascript">')[1]
        courses = data.split('<div class="course">')[1:]
        partial_catalog = [c for c in map(parse_course, courses) if c]
        for c in partial_catalog:
            catalog.update(c)
    return catalog


def get_json(index_url):
    catalog = parse_url(index_url)
    return catalog


def save_json(catalog, outfile):
    with open(outfile, 'w') as f:
        json.dump(catalog, f, encoding='utf-8', indent=2)


def json2js(infile, outfile):
    with open(infile, 'r') as inf:
        lines = inf.readlines()
        s = " \ \n".join(map(lambda s: s.replace("\n", ""), lines))
        s = "var courseText = '''" + s + \
            "'''; \nvar courseData = JSON.parse(courseText);\n"
    with open(outfile, 'w') as outf:
        outf.write(s)


if __name__ == "__main__":
    catalog = get_json(INDEX)
    save_json(catalog, '../js/new.json')
