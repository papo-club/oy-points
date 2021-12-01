import logging
import sys
from csv import DictReader
from os import path
from sys import stdin

from helpers.connection import commit_and_close, tables, session

logging.basicConfig(level=logging.INFO, format="")
csv_path = path.join(path.dirname(__file__), "../..", sys.argv[1])

fieldname_mapper = {
    "member_id": "ONZ ID",
    "first_name": "First name",
    "last_name": "Last name",
    "DOB": "Date of birth",
    "gender": "Gender",
}

seasons = session.query(tables.Season.year)
logging.info("available seasons:")
for season in seasons:
    logging.info(season.year)
while True:
    logging.info("season?")
    try:
        season = int(stdin.readline())
    except ValueError:
        logging.info("that is not a valid season.")
    else:
        if season in {field.year for field in seasons}:
            break
        logging.info("that is not a valid season.")

with open(csv_path, "r") as members_csv:
    for row in DictReader(members_csv):
        logging.info("adding member "
                     f"{row['First name']} {row['Last name']}",
                     )
        session.merge(tables.Member(year=season,
                                    **{fieldname: row[csvfieldname] for fieldname,
                                        csvfieldname in fieldname_mapper.items()},
                                    ),
                      )

commit_and_close()
