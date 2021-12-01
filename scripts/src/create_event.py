import logging
from sys import stdin

from dateutil import parser
from helpers.connection import session, tables, commit_and_close
from sqlalchemy import select

MAX_EVENTS = 10

logging.basicConfig(level=logging.INFO, format="")

seasons = session.query(tables.Season.year)
disciplines = session.query(tables.Discipline)

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


while True:
    logging.info("event # in series?")
    try:
        number = int(stdin.readline())
    except ValueError:
        logging.info("that is not a valid event #.")
    else:
        if 0 < number < MAX_EVENTS:
            break
        logging.info("that is not a valid event #.")

logging.info("event name (normally leave blank to automatically name)")
name = stdin.readline().strip()

while True:
    logging.info("event date?")
    try:
        date = parser.parse(stdin.readline()).strftime("%Y-%m-%d")
    except parser.ParserError:
        logging.info("that is not a valid date.")
    else:
        break

logging.info("adding event to record...")
session.add(
    tables.Event(
        year=season,
        number=number,
        date=date,
        name=name,
    ),
)

while True:
    logging.info("amount of races in event?")
    try:
        races_num = int(stdin.readline())
    except ValueError:
        logging.info("that is not a valid number of races")
    else:
        if 0 < number < MAX_EVENTS:
            break
        logging.info("that is not a valid number of races")

for race in range(races_num):
    logging.info(f"RACE {race + 1}")

    while True:
        logging.info("map name?")
        map_name = stdin.readline().strip()
        if map_name:
            break

    logging.info("available disciplines:")
    for discipline in disciplines:
        logging.info(f"{discipline.discipline_id}: {discipline.name}")
    while True:
        logging.info("discipline code?")
        event_disc = stdin.readline().strip().upper()
        discipline_ids = {
            discipline.discipline_id.upper() for discipline in disciplines
        }
        if event_disc in discipline_ids:
            break
        else:
            logging.info("that is not a valid discipline.")

    session.add(
        tables.Race(
            year=season,
            event_number=number,
            number=race + 1,
            map=map_name,
            discipline_id=event_disc
        )
    )


commit_and_close()
