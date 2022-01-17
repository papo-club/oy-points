import logging
from invalid import prompt
import sys
from csv import DictReader
from os import path
from sys import stdin

from helpers.connection import commit_and_close, tables, session
from helpers.args import get_filename, get_season

logging.basicConfig(level=logging.INFO, format="")
season = get_season()

fieldname_mapper = {
    "member_id": "ONZ ID",
    "first_name": "First name",
    "last_name": "Last name",
    "DOB": "Date of birth",
    "gender": "Gender",
}

with open(get_filename(), "r") as members_csv:
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
