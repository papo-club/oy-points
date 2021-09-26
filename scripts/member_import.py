from helpers.connection import commit_and_close, cursor
from csv import DictReader
import logging
import sys
from os import path

logging.basicConfig(level=20)


csv_path = path.join(path.dirname(__file__), "..", sys.argv[1])

fieldname_mapper = {
    "idmember": "ONZ ID",
    "first_name": "First name",
    "last_name": "Last name",
    "DOB": "Date of birth",
    "gender": "Gender",
}

with open(csv_path, "r") as f:
    for row in DictReader(f):
        row_data = [
            row[fieldname] for fieldname in fieldname_mapper.values()]
        logging.info(f"adding member {row['First name']} {row['Last name']}")
        cursor.execute(
            f"REPLACE INTO oypoints.member "
            f"({','.join(fieldname_mapper.keys())}) VALUES (%s, %s, %s, %s, %s)",
            row_data)

commit_and_close()
