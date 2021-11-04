import logging
from sys import stdin

from dateutil import parser
from helpers.connection import commit_and_close, cursor_dict

MAX_EVENTS = 10

logging.basicConfig(level=logging.INFO, format="")

cursor_dict.execute("SELECT year FROM oypoints.season")
seasons = cursor_dict.fetchall()
cursor_dict.execute("SELECT * FROM oypoints.discipline")
disciplines = cursor_dict.fetchall()

logging.info("available seasons:")
for season in seasons:
    logging.info(season["year"])
while True:
    logging.info("season?")
    try:
        season = int(stdin.readline())
    except ValueError:
        logging.info("that is not a valid season.")
    else:
        if season in {field["year"] for field in seasons}:
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

while True:
    logging.info("event name?")
    name = stdin.readline().strip()
    if name:
        break

logging.info("available disciplines:")
for discipline in disciplines:
    logging.info(f"{discipline['iddiscipline']}: {discipline['name']}")
while True:
    logging.info("discipline code?")
    event_disc = stdin.readline().strip().upper()
    discipline_ids = {
        discipline["iddiscipline"].upper() for discipline in disciplines
    }
    if event_disc in discipline_ids:
        break
    else:
        logging.info("that is not a valid discipline.")

while True:
    logging.info("event date?")
    try:
        date = parser.parse(stdin.readline()).strftime("%Y-%m-%d")
    except parser.ParserError:
        logging.info("that is not a valid date.")
    else:
        break

logging.info("adding event to record...")
cursor_dict.execute(
    "REPLACE INTO oypoints.event "
    "VALUES (%s, %s, %s, %s, %s)",
    [season, number, name, date, event_disc],
)

commit_and_close()
