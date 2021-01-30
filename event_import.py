from mysql.connector.cursor import RE_SQL_INSERT_STMT
import textdistance
import re
from fuzzywuzzy import process, fuzz
import mysql.connector
import csv
import sys
from dateutil.parser import parse
import datetime
from os import system
from nickname_lookup import python_parser


def field_repr(*args):
    rep_arr = [field.__repr__() for field in args]
    return f"({', '.join(rep_arr)})"
def clear():
    system("cls")
    system("clear")

cnx = mysql.connector.connect(
    host="127.0.0.1",
    port=3306,
    user="root",
    password="admin")

csv_paths = sys.argv[1:]
commit = True

cursor = cnx.cursor(dictionary=True)

clear()

status_code = {
    0: "OK",
    1: "DNS",
    2: "DNF",
    3: "MP",
    4: "DQ"
}

cursor.execute(f"SELECT year FROM mydb.season")
seasons = [str(year) for year in cursor.fetchall()[0].values()]
print("available seasons:", " ,".join(seasons))
while True:
    try:
        curr_season = str(datetime.datetime.now().year)
        season = input(f"press enter for {curr_season}, or type other season: ")
        if not season:
            season = curr_season
            break
        if season in seasons:
            break
        raise Exception
    except Exception as e:
        print("that is not a valid season.")        

while True:
    try:
        number = int(input("🔢 event # in series: OY"))
        if 0 < number < 99:
            break
        else: raise Exception
    except:
        print("that is not a valid event #")

cursor.execute(f"SELECT * FROM mydb.event_types")
event_types = cursor.fetchall()
for event_type in event_types:
    print(f"{event_type['idevent_types']}: {event_type['name']}")

while True:
    event = input("🌲 select event code: ").upper()
    if event in [event_type['idevent_types'].upper() for event_type in event_types]:
        if event == "DBL" and len(sys.argv[1:]) != 2:
            print("a double sprint event type needs two result spreadsheets for a successful import.")
            print("aborting.")
            sys.exit()
        else:
            break
    else:
        print("that is not a valid event type.")

names = []
while True:
    if event == "DBL":
        name = input("create name for first double sprint event: ")
        if name:
            names.append(name)
            name = input("create name for second double sprint event: ")
            if name:
                if name == names[0]:
                    print("the two double sprint event names have to be different.")
                    continue
                names.append(name)
                break
    else:
        name = input("🆔 create event name: ")
        if name: 
            names.append(name)
            break

while True:
    try:
        date = parse(input("📅 enter event date: "))
        date = date.strftime("%Y-%m-%d")
        break
    except:
        print("that is not a valid date.")

clear()


def get_details(member):
    first, last = member.split("%")
    cursor.execute("SELECT idmember, DOB, gender FROM mydb.member WHERE first_name = %s AND last_name = %s", (first, last)) 
    a = cursor.fetchall()[0]
    return a["idmember"], a["DOB"], a["gender"] 

def get_member_name(member_id):
    cursor.execute("SELECT first_name, last_name FROM mydb.member WHERE idmember = %s", (member_id,))
    a = cursor.fetchall()[0]
    return a["first_name"] + " " + a["last_name"]

def subset(*names):
    names = [re.split(' |-|/', name) for name in names]
    names.sort(key=lambda element: len(element)) # last name with less first
    if len(names[0]) == len(names[1]):
        for parts in zip(*names):
            if textdistance.levenshtein(*parts) > 2:
                return False
        return True
    else:
        for part1 in names[0]:
            for part2 in names[1]:
                if textdistance.levenshtein(part1, part2) <= 2:
                    return True
        return False

time_warnings = []

def import_result(member_id, result):
    status = status_code[int(result["Classifier"])]
    time = result["Time"]
    if status not in ["DNS", "DNF"]:
        if time:
            #TODO: account for DNS
            time = [int(time) for time in time.split(":")]
            time = [0] * (3 - len(time)) + time
            if time[0] > 10 and time[2] == 0:
                time_repr = ':'.join([str(value).zfill(2) for value in time])
                time_warnings.append(f"⚠\uFE0F  importing bad time {time_repr} as 00:{':'.join([str(value).zfill(2) for value in time[0:2]])}")
                time[0], time[1], time[2] = 0, time[0], time[1]
                if time[0] > 24:
                    time_warnings.append(f"⚠\uFE0F  not importing bad time {time_repr}")
                    time = None
        else:
            time_warnings.append(f"❌ could not find time for member #{member_id} ({get_member_name(member_id)}) despite status being {status}. Importing anyway")
            time = None
    else:
       time = None 

    cursor.execute(f"""INSERT INTO mydb.result (
        member_idmember,
        event_grades_event_season_idyear,
        event_grades_event_num,
        event_grades_grade_idgrade, 
        time,
        status,
        points
        ) VALUES (%s, %s, %s, %s, %s, %s, %s)""", 
        (
            member_id,
            season,
            number,
            result["Short"],
            datetime.time(*time) if time else None,
            status,
            None
        ))


class Competitor():
    def __init__(self, field) -> None:
        self.first, self.last = field["First name"].lower(), field["Surname"].lower()
        self.dob = field["YB"]
        self.gender = field["S"]

        self.member = None

    def __repr__(self):
        return f"{self.first} {self.last}"
    
    def find_closest_members(self, members):
        self.closest_members = process.extract("%".join([self.first, self.last]), members, limit=3, scorer=fuzz.token_sort_ratio)
        self.closest_members = [list(match) for match in self.closest_members]
        for match in self.closest_members:
            match.append({
                "subset": False,
                "denormalization": False
            })

class Member(Competitor):
    def __init__(self, name) -> None:
        super().__init__(name)

event_grades = []
print(" ℹ\uFE0F adding event to record...")
for name, csv_path in zip(names, csv_paths):
    cursor.execute(f"INSERT INTO mydb.event VALUES {field_repr(season, number, name, date, event)}")

    print(" ℹ\uFE0F creating event grades...")
    with open(csv_path, "r") as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            if row["Short"] and row["Short"] not in event_grades:
                event_grades.append(row["Short"])

    cursor.execute(f"SELECT * FROM mydb.grade WHERE season_idyear = {season}")
    grades = [row["idgrade"].upper() for row in cursor.fetchall()]

    for event_grade in event_grades:
        if event_grade not in grades:
            print(f"⚠\uFE0F  grade {event_grade} not in {season} OY season; omitting")
            del event_grade
    for grade in grades:
        if grade not in event_grades:
            print(f"⚠\uFE0F  {season} OY season grade {grade} not used in this event")

    for event_grade in event_grades:
        pass
        cursor.execute(f"INSERT INTO mydb.event_grades VALUES {field_repr(event_grade, season, number)}")

    cursor.execute(f"SELECT * FROM mydb.member")
    members = [row["first_name"] + "%" + row["last_name"] for row in cursor.fetchall()]


    competitors = []

    print(" ℹ\uFE0F creating competitor-member relations...")
    with open(csv_path, "r") as csvfile:
        reader = csv.DictReader(csvfile)
        for field in reader:
            competitors.append(competitor := Competitor(field))
            competitor.find_closest_members(members)

            if len([result for result in competitor.closest_members if result == 100]) > 1:
                print(f"🛑 multiple members with name {repr(competitor)} found")
                sys.exit()
            for member, score, tests in competitor.closest_members:

                first, last = member.lower().split('%')
                if score == 100:
                    member_id, member_dob, member_gender = get_details(member)
                    import_result(member_id, field)
                    competitor.member = member
                    break
                elif score > 70:
                    if competitor.last == last:
                        tests["subset"] = "perfect"
                    else:
                        if subset(competitor.last, last):
                            tests["subset"] = "passed"
                        else:
                            tests["subset"] = "failed"
                    if competitor.first == first:
                        tests["denormalization"] = "perfect"
                    else:
                        denormalizer = python_parser.NameDenormalizer("nickname_lookup/names.csv")
                        try:
                            if competitor.first in denormalizer[first]:
                                tests["denormalization"] = "passed"
                            else:
                                tests["denormalization"] = "failed"
                        except KeyError:      
                            tests["denormalization"] = "noname"
                
                    if tests["subset"] in ["perfect", "passed"]:
                        if  tests["denormalization"] in ["perfect", "passed"]:
                            member_id, member_dob, member_gender = get_details(member)
                            import_result(member_id, field)
                            competitor.member = member
                            break
                    competitor.member = False


    print(" ℹ\uFE0F done")
    input(" ℹ\uFE0F press enter to continue to import overview: ")

    clear()

    print(f"🆔 {name}")
    print(f"📅 {date}")
    print(f"🌲 {event}")
    print()

    for warning in time_warnings:
        print(warning)


    print()
    for competitor in competitors:
        if competitor.member:
            for member, score, tests in competitor.closest_members:
                if member == competitor.member:
                    if score != 100:
                        print(f"⚠\uFE0F  importing '{repr(competitor)}' as ⭕ {member.replace('%', ' ')}:")
                        for key, value in tests.items():
                            if value == "passed":
                                print(f"    ✅ passed {key.upper()} test")
        else:
            member, score, tests = competitor.closest_members[0]
            if score >= 90:
                print(f"⚠\uFE0F  not importing '{repr(competitor)}' (closest match: ⭕ {member.replace('%', ' ')}:")
                for key, value in tests.items():
                    if value == "failed":
                        print(f"    ❌ failed {key.upper()} test")
                    elif value == "passed":
                        print(f"    ✅ passed {key.upper()} test")
                    elif value == "noname":
                        print(f"    📛 nonamed {key.upper()} test")

    print()
    print("⚠\uFE0F  list of possible matches:")
    for competitor in competitors:
        if not competitor.member:
            member, score, tests = competitor.closest_members[0]
            if score >= 70:
                print ("   ", repr(competitor).ljust(25),
                        f"{score}%",
                        f"{competitor.gender}",
                        f"{competitor.dob}".ljust(5),
                        f"⭕ {member.replace('%', ' ')}")
    
    print()
    print("⚠\uFE0F  full list of non-members after import:")
    for competitor in competitors:
        if not competitor.member:
            member, score, tests = competitor.closest_members[0]
            if score < 70:
                print("    non-member:", repr(competitor).ljust(25))

    print()
    print("⚠\uFE0F  please review the changes before importing")
    while True:
        i = input(" ℹ\uFE0F type 'continue' to import this event: ")
        if i:
            if i == "continue":
                break
            else:
                j = input("press enter to quit import ")
                if not j:
                    print("aborting...")
                    sys.exit()
                continue

print(" ℹ\uFE0F importing results...")
if commit: cnx.commit()
print(" ℹ\uFE0F done")