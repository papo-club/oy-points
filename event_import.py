from fuzzywuzzy import process, fuzz
import mysql.connector
import csv
import sys
from enum import Enum
from dateutil.parser import parse
import datetime
import logging
from os import system

def field_repr(*args):
    rep_arr = [field.__repr__() for field in args]
    return f"({', '.join(rep_arr)})"

class Event_Types(Enum):
    pass

csv_path = sys.argv[1]

cnx = mysql.connector.connect(
    host="127.0.0.1",
    port=3306,
    user="root",
    password="admin")

def clear():
    system("cls")
    system("clear")

commit = False
logging.basicConfig(level="INFO")

cursor = cnx.cursor(dictionary=True)

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
    except:
        print("that is not a valid season.")

while True:
    try:
        number = int(input("event # in series: OY"))
        if 0 < number < 99:
            break
        else: raise Exception
    except:
        print("that is not a valid event #.")

while True:
    name = input("create event name: ")
    if name: break

cursor.execute(f"SELECT * FROM mydb.event_types")
event_types = cursor.fetchall()
for event_type in event_types:
    print(f"{event_type['idevent_types']}: {event_type['name']}")

while True:
    event = input("select event code: ").upper()
    if event in [event_type['idevent_types'].upper() for event_type in event_types]:
        break
    else:
        print("that is not a valid event type.")

while True:
    try:
        date = parse(input("enter event date: "))
        date = date.strftime("%Y-%m-%d")
        break
    except:
        print("that is not a valid date.")

clear()

logging.info("adding event to record...")
cursor.execute(f"INSERT INTO mydb.event VALUES {field_repr(season, number, name, date, event)}")
if commit: cnx.commit()

event_grades = []
logging.info("creating event grades...")
with open(csv_path, "r") as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        if row["Short"] and row["Short"] not in event_grades:
            event_grades.append(row["Short"])


cursor.execute(f"SELECT * FROM mydb.grade WHERE season_idyear = {season}")
grades = [row["idgrade"].upper() for row in cursor.fetchall()]

for event_grade in event_grades:
    if event_grade not in grades:
        logging.warning(f"grade {event_grade} not in {season} OY season; omitting")
        del event_grade
for grade in grades:
    if grade not in event_grades:
        logging.info(f"{season} OY season grade {grade} not used in this event")

for event_grade in event_grades:
    cursor.execute(f"INSERT INTO mydb.event_grades VALUES {field_repr(event_grade, season, number)}")
if commit: cnx.commit()

cursor.execute(f"SELECT * FROM mydb.member")
members = [row["first_name"] + "%" + row["last_name"] for row in cursor.fetchall()]

def get_details(member):
    first, last = member.split("%")
    cursor.execute(f"SELECT DOB, gender FROM mydb.member WHERE first_name = %s AND last_name = %s", (first, last)) 
    a = cursor.fetchall()[0]
    return a["DOB"], a["gender"] 

non_members = []

with open(csv_path, "r") as csvfile:
    reader = csv.DictReader(csvfile)
    for competitor in reader:
        competitor_dob = competitor["YB"]
        competitor_gender = competitor["S"]
        competitor = competitor["First name"] + "%" + competitor["Surname"]
        result = process.extract(competitor, members, limit=3, scorer=fuzz.token_sort_ratio)
        competitor = competitor.replace("%", " ")
        if result[0][1] == 100:
            
            if result[1][1] == 100:
                logging.error(f"OMITTING:multiple members with name {competitor} found")
            else:
                member = result[0][0]
                member_dob, member_gender = get_details(member)
                member = member.replace("%", " ")
                if competitor_dob and competitor_gender:
                    if member_dob.year == int(competitor_dob) and member_gender == competitor_gender:
                        pass # here
                    else:
                        logging.warning(f"ADDING:details of {competitor} do not match with the members database")
                        # pass

                else:
                    # logging.info(f"found competitor {competitor} but their gender or DOB is missing, ADDING")
                    # here
                    pass
        elif result[0][1] > 70:
            for re in result:
                member = re[0]
                member_dob, member_gender = get_details(member)
                member = member.replace("%", " ")
                if competitor_dob:
                    if member_dob.year == int(competitor_dob) and member_gender == competitor_gender:
                        if re[1] >= 90:
                            # here
                            pass
                        else:
                            logging.warning(f"ADDING:match between {competitor} and {member} is not certain, but DOB and gender match")
                            # here
                        break
                else:
                    if re[1] >= 90:
                        if member_gender == competitor_gender:
                            logging.warning(f"ADDING:match between {competitor} and {member} is not certain, but gender matches")
                            break
            else:
                non_members.append(competitor)
                # logging.info(f"no member could be found matching {competitor}, OMITTING (closest match: {result[0][0].replace('%', ' ')})")
                # logging.warning(f"no membership found for competitor {competitor} ({competitor_dob}, {competitor_gender}), OMITTING") 
                pass
                
        else:
            non_members.append(competitor)
            # logging.warning(f"no membership found for competitor {competitor} ({competitor_dob}, {competitor_gender}), OMITTING")
            pass

logging.info(f"non-members omitted in this import: {', '.join(non_members)}")