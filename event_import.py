import fuzzywuzzy
import mysql.connector
import csv
import sys
from enum import Enum
from dateutil.parser import parse


class Event_Types(Enum):
    pass

csv_path = sys.argv[0]

cnx = mysql.connector.connect(
    host="127.0.0.1",
    port=3306,
    user="root",
    password="admin")


cursor = cnx.cursor()

cursor.execute(f"SELECT year FROM mydb.season")
seasons = cursor.fetchall()[0]
print("available seasons:", " ,".join([str(year) for year in seasons]))
while True:
    try:
        season = int(input("select season: "))
        if season in seasons:
            break
        else: raise Exception
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
    print(f"{event_type[0]}: {event_type[1]}")

while True:
    event = input("select event code: ").upper()
    if event in [event_type[0].upper() for event_type in event_types]:
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

print("adding event to record...")
cursor.execute(f"INSERT INTO mydb.event VALUES({', '.join([field.__repr__() for field in [season, number, name, date, event]])})")
cnx.commit()

with open(csv_path, "r") as csvfile:
    reader = csv.DictReader(csv_path)
    for row in reader:
        pass
