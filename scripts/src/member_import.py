import logging
import sys
from csv import DictReader
from os import path

from helpers.connection import commit_and_close, cursor_dict

logging.basicConfig(level=logging.INFO, format="")
csv_path = path.join(path.dirname(__file__), "../..", sys.argv[1])

fieldname_mapper = {
    "idmember": "ONZ ID",
    "first_name": "First name",
    "last_name": "Last name",
    "DOB": "Date of birth",
    "gender": "Gender",
}

with open(csv_path, "r") as members_csv:
    for row in DictReader(members_csv):
        row_data = [
            row[fieldname] for fieldname in fieldname_mapper.values()
        ]
        logging.info("adding member "
                     f"{row['First name']} {row['Last name']}",
                     )

        keys = ",".join(fieldname_mapper.keys())
        cursor_dict.execute(
            "REPLACE INTO oypoints.member "
            f"({keys}) VALUES (%s, %s, %s, %s, %s)",
            row_data,
        )

commit_and_close()
