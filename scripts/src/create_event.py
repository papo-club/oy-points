import logging
from sys import stdin

from helpers.connection import session, tables, commit_and_close
from sqlalchemy import select
from invalid import prompt
from helpers.args import get_season

MAX_EVENTS = 10
MAX_RACES = 3

logging.basicConfig(level=logging.INFO, format="")
season = get_season()

disciplines = session.query(tables.Discipline)

event_props = prompt.Form({
    "number": prompt.Int(
        "OY #",
        validate=lambda x: 0 < int(x) <= MAX_EVENTS,
    ),
    "races": prompt.Int(
        "amount of races in event",
        validate=lambda x: 0 < int(x) <= MAX_RACES,
    ),
    "date": prompt.Date("event date"),
}).execute()


logging.info("adding event to record...")
session.add(
    tables.Event(
        year=season,
        number=event_props["number"],
        date=event_props["date"],
    ),
)

for race_props in range(1, event_props["races"] + 1):
    logging.info(f"RACE {race_props + 1}")
    race_props = prompt.Form({
        "map": prompt.Text(f"map name for race {race_props}"),
        "discipline": prompt.List(
            f"discipline for race {race_props}", {
                discipline.name: discipline.discipline_id for discipline in session.query(
                    tables.Discipline
                ).all()
            })
    }).execute()

    session.add(
        tables.Race(
            year=season,
            event_number=event_props["number"],
            number=race_props,
            map=race_props["map"],
            discipline_id=race_props["discipline"],
        ),
    )

commit_and_close()
