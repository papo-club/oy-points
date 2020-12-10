from fuzzywuzzy import process, fuzz
import mysql.connector
import csv
import sys
from enum import Enum
from dateutil.parser import parse
import datetime
import logging
from os import system

logging.basicConfig(level="INFO")

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

csv_path = sys.argv[1]
commit = True

cursor = cnx.cursor(dictionary=True)

clear()

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

cursor.execute(f"SELECT * FROM mydb.member")
members = [row["first_name"] + "%" + row["last_name"] for row in cursor.fetchall()]

def get_details(member):
    first, last = member.split("%")
    cursor.execute(f"SELECT idmember, DOB, gender FROM mydb.member WHERE first_name = %s AND last_name = %s", (first, last)) 
    a = cursor.fetchall()[0]
    return a["idmember"], a["DOB"], a["gender"] 

non_members = []

def import_result(member_id, result):
    time = result["Time"]
    #TODO: account for DNS
    time = [int(time) for time in time.split(":")]
    time = [0] * (3 - len(time)) + time
    if time[0] > 10 and time[2] == 0:
        logging.warning(f"found bad time {':'.join([str(value).zfill(2) for value in time])}, correcting to 00:{':'.join([str(value).zfill(2) for value in time[0:2]])}")
        time[0], time[1], time[2] = 0, time[0], time[1]
        if time[0] > 24:
            logging.error(f"found bad time {':'.join([str(value).zfill(2) for value in time])}, skipping entry")
            time = None

    cursor.execute(f"""INSERT INTO mydb.result (
        member_idmember,
        event_grades_event_season_idyear,
        event_grades_event_num,
        event_grades_grade_idgrade, 
        time,
        points
        ) VALUES (%s, %s, %s, %s, %s, %s)""", 
        (
            member_id,
            season,
            number,
            result["Short"],
            datetime.time(*time),
            None
        ))

with open(csv_path, "r") as csvfile:
    reader = csv.DictReader(csvfile)
    for field in reader:
        competitor_dob = field["YB"]
        competitor_gender = field["S"]
        competitor = field["First name"] + "%" + field["Surname"]
        result = process.extract(competitor, members, limit=3, scorer=fuzz.token_sort_ratio)
        competitor = competitor.replace("%", " ")
        if result[0][1] == 100:
            
            if result[1][1] == 100:
                logging.error(f"OMITTING:multiple members with name {competitor} found")
            else:
                member = result[0][0]
                member_id, member_dob, member_gender = get_details(member)
                member = member.replace("%", " ")
                if competitor_dob and competitor_gender:
                    if member_dob.year == int(competitor_dob) and member_gender == competitor_gender:
                        import_result(member_id, field)
                    else:
                        logging.warning(f"ADDING:details of {competitor} do not match with the members database")
                        import_result(member_id, field)

                else:
                    # logging.info(f"found competitor {competitor} but their gender or DOB is missing, ADDING")
                    import_result(member_id, field)
                    pass
        elif result[0][1] > 70:
            for re in result:
                member = re[0]
                member_id, member_dob, member_gender = get_details(member)
                member = member.replace("%", " ")
                if competitor_dob:
                    if member_dob.year == int(competitor_dob) and member_gender == competitor_gender:
                        if re[1] >= 90:
                            import_result(member_id, field)
                            pass
                        else:
                            logging.warning(f"ADDING:match between {competitor} and {member} is not certain, but DOB and gender match")
                            import_result(member_id, field) 
                        break
                else:
                    if re[1] >= 90:
                        if member_gender == competitor_gender:
                            logging.warning(f"ADDING:match between {competitor} and {member} is not certain, but gender matches")
                            import_result(member_id, field)
                            break
                        else:
                            logging.warning(f"OMITTING:match between {competitor} and {member} is likely but all details are different")

            else:
                non_members.append(
                    [competitor.ljust(25),
                    f"{result[0][1]}%",
                    f"{competitor_gender}",
                    f"DOB:{competitor_dob}".ljust(9),
                    f"c:{result[0][0].replace('%', ' ')}"])
                
        else:
          non_members.append(
            [competitor.ljust(25),
            f"{result[0][1]}%",
            f"{competitor_gender}",
            f"DOB:{competitor_dob}".ljust(9)])

non_members.sort(key=lambda x: x[1], reverse=True)
logging.info(f"non-members omitted in this import:")
print(*(' '.join(row) for row in non_members), sep='\n')
print()

i = input("press enter to continue import: ")
if i == "n" or i == "no":
    print("aborting...")
    sys.exit()

logging.info("importing results...")
logging.info("done!")
if commit: cnx.commit()