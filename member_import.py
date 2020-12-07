import warnings
warnings.filterwarnings("ignore")

from fuzzywuzzy import process
import mysql.connector
import csv
import sys
from os import path
from datetime import date

csv_path = path.normpath(path.join(path.dirname(__file__), sys.argv[1]))
with open(csv_path, "r") as csvfile:
    fieldnames = csv.DictReader(csvfile).fieldnames

class Field:
    def __init__(self, names, _type):
        self.names = names
        self.type = _type

        self.find_id()
    
    def find_id(self):
        results = []
        
        for name in self.names:
            results.append(process.extractOne(name, fieldnames))
        
        best_result = ("", 0)
        for result in results:
            if result[1] > best_result[1]:
                best_result = result

        self.id = best_result[0]

fields = [
    Field(["id"], int),
    Field(["last name"], str),
    Field(["first name"], str),
    Field(["dob", "date of birth"], str),
    Field(["sex", "gender"], str)
]

for field in fields:
    print(f"found {field.names[0]} column: {field.id.__repr__()}")
print()
if input("type y if fields are correct: " ).lower() != "y": sys.exit()

cnx = mysql.connector.connect(
    host="127.0.0.1",
    port=3306,
    user="root",
    password="admin")

cursor = cnx.cursor()

with open(csv_path, "r") as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        print('\033[2J')
        print(f"adding member {row['First name']} {row['Last name']}")
        cursor.execute(f"INSERT INTO mydb.member VALUES ({', '.join([field.type(row[field.id]).__repr__() for field in fields])})")
    print("commiting changes...")
    cnx.commit()

cursor.close()