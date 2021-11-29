import logging
import sys
from csv import DictReader
from os import path

from helpers.connection import commit_and_close, tables, session

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
        logging.info("adding member "
                     f"{row['First name']} {row['Last name']}",
                     )
        session.merge(
            tables.Member(
                **{fieldname: row[csvfieldname] for fieldname, csvfieldname in fieldname_mapper.items()},
            ),
        )

commit_and_close()
