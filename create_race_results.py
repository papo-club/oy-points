status_code = {
    0: "OK",
    1: "DNS",
    2: "DNF",
    3: "MP",
    4: "DQ" }

import prompt
import inquirer
import simple_term_menu
from connection import Tables, session
from connection import Race
import datetime
import sys
import re
import textdistance
from nickname_lookup import python_parser
import csv
from fuzzywuzzy import process, fuzz

csv_path = sys.argv[1]
race = session.query(Race).get((
    inquirer.list_input(message="season", choices=[season.year for season in session.query(Tables.season).all()]),
    oy_num := inquirer.list_input(message="OY #", choices=[oy.number for oy in session.query(Tables.event).all()]),
    inquirer.list_input(message=f"race # for oy {oy_num}", choices=[race.race_number for race in session.query(Race).filter_by(event_number=oy_num)])
))

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

def import_result(member, result):
    status = status_code[int(result["Classifier"])]
    time = result["Time"]
    if time:
        time = [int(time) for time in time.split(":")]
        time = [0] * (3 - len(time)) + time
        if time[0] > 6 and time[2] == 0:
            time_repr = ':'.join([str(value).zfill(2) for value in time])
            time_warnings.append(f"⚠\uFE0F  importing bad time {time_repr} as 00:{':'.join([str(value).zfill(2) for value in time[0:2]])}")
            time[0], time[1], time[2] = 0, time[0], time[1]
            if time[0] > 24:
                time_warnings.append(f"⚠\uFE0F  not importing bad time {time_repr}")
                time = None
    else:
        time = None
        if status not in ["DNS", "DNF"]:
            time_warnings.append(f"❌ could not find time for member #{member.id} ({repr(member)}) despite status being {status}. Importing anyway")

    session.add(Tables.race_result(
        year=race.year,
        event_number=race.event_number,
        race_number=race.race_number,
        member=session.query(Tables.member).get(member.id),
        race_grade=result["Short"],
        status=status,
        time=datetime.time(*time) if time else None,
        score_points=None
    ))

class Competitor():
    def __init__(self, field) -> None:
        self.first, self.last = field["First name"], field["Surname"]
        self.dob = field["YB"]
        self.gender = field["S"]

        self.member = None
        self.closest = []

    def __repr__(self):
        return f"{self.first} {self.last}"
    
    def find_closest_members(self, members):
        closest_members = process.extract(f"{self.first}%{self.last}", [f"{f.lower()}%{l.lower()}" for f, l in members], limit=3, scorer=fuzz.token_sort_ratio)
        for match in closest_members:
            f, l = match[0].split("%")
            self.closest.append(Member(
                *session.query(Tables.member.idmember, Tables.member.first_name, Tables.member.last_name).filter_by(first_name=f, last_name=l).one(),
                match[1], # result
                {
                    "subset": False,
                    "denormalization": False
                }
            ))

class Member():
    def __init__(self, id, first, last, result, tests):
        self.id = id
        self.first = first
        self.last = last
        self.result = result
        self.tests = tests

    def __repr__(self):
        return f"{self.first} {self.last}"   

competitors = []

def run_tests(competitor, member):
    if member.result == 100:
        return True
    else:
        if competitor.last == member.last:
            member.tests["subset"] = "perfect"
        else:
            if subset(competitor.last, member.last):
                member.tests["subset"] = "passed"
            else:
                member.tests["subset"] = "failed"
        if competitor.first == member.first:
            member.tests["denormalization"] = "perfect"
        else:
            denormalizer = python_parser.NameDenormalizer("nickname_lookup/names.csv")
            try:
                if competitor.first.lower() in denormalizer[member.first]:
                    member.tests["denormalization"] = "passed"
                else:
                    member.tests["denormalization"] = "failed"
            except KeyError:      
                member.tests["denormalization"] = "noname"
    
        if member.tests["subset"] in ["perfect", "passed"] and member.tests["denormalization"] in ["perfect", "passed"]:
                return True
        else:
            return False

print(" ℹ\uFE0F creating competitor-member relations...")
with open(csv_path, "r") as csvfile:
    reader = csv.DictReader(csvfile) 
    all_members = session.query(Tables.member.first_name, Tables.member.last_name).all()
    for field in reader:
        competitors.append(competitor := Competitor(field))
        competitor.find_closest_members(all_members)

        competitor.closest = list(filter(lambda member: member.result >= 70, competitor.closest))
        if not competitor.closest:
            competitor.member = None
        elif len([member.result for member in competitor.closest if member.result == 100]) > 1:
            print(f"🛑 multiple members with name {repr(competitor)} found")
            sys.exit()
        else:
            for member in competitor.closest:
                if run_tests(competitor, member):
                    competitor.member = member
                    competitor.closest = None
                    import_result(member, field)
                    break
            else:
                competitor.closest = competitor.closest[0]

print(" ℹ\uFE0F done")
input(" ℹ\uFE0F press enter to continue to import overview: ")

print(f"🆔 {race.map_name}")
# print(f"📅 {race.date}")
print(f"🌲 OY #{race.event_number}")
print()

for warning in time_warnings:
    print(warning)

print()
for competitor in competitors:
    if competitor.member:
        if competitor.member.result != 100:
                print(f"⚠\uFE0F  importing '{repr(competitor)}' as ⭕ #({competitor.member.id}) {repr(competitor.member)}:")
                for key, value in competitor.member.tests.items():
                    if value == "passed":
                        print(f"    ✅ passed {key.upper()} test")
                    if value == "perfect":
                        print(f"    💯 passed {key.upper()} test")

    elif competitor.closest:
        if competitor.closest.result >= 90:
            print(f"⚠\uFE0F  not importing '{repr(competitor)}' (closest match: ⭕ #({competitor.closest.id}) {repr(competitor.closest)}):")
            for key, value in competitor.closest.tests.items():
                if value == "failed":
                    print(f"    ❌ failed {key.upper()} test")
                elif value == "passed":
                    print(f"    ✅ passed {key.upper()} test")
                elif value == "perfect":
                    print(f"    💯 passed {key.upper()} test")
                elif value == "noname":
                    print(f"    📛 nonamed {key.upper()} test")

print()
print("⚠\uFE0F  list of possible matches:")
for competitor in competitors:
    if not competitor.member and competitor.closest:
        print ("   ", repr(competitor).ljust(25),
                f"{competitor.closest.result}%",
                f"{competitor.gender}",
                f"{competitor.dob}".ljust(5),
                f"⭕ #({competitor.closest.id}) {repr(competitor.closest)}")

print()
print("⚠\uFE0F  full list of non-members after import:")
for competitor in competitors:
    if not competitor.member:
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
session.commit()
session.close()
print(" ℹ\uFE0F done")
sys.exit()
