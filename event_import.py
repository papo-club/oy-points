import fuzzywuzzy
import mysql.connector
import csv
import sys

csv_path = sys.argv[0]

cnx = mysql.connector.connect(
    host="127.0.0.1",
    port=3306,
    user="root",
    password="admin")

cursor = cnx.cursor()
cursor.execute(f"INSERT INTO event VALUES(2020, {event_num}, {event_name}, ")

with open(csv_path, "r") as csvfile:
    reader = csv.DictReader(csv_path)
    for row in reader:
        pass
