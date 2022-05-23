import logging
from types import SimpleNamespace

import sshtunnel
from invalid import prompt
from sqlalchemy import create_engine, select
from sqlalchemy.ext.automap import automap_base
from sqlalchemy.orm import Session  # type: ignore
from helpers.connection import get_session_and_tables, commit_and_close
from helpers.args import get_season

MAX_EVENTS = 10
MAX_RACES = 3

logging.basicConfig(level=logging.INFO, format="")
season = get_season()

tunnel, session, tables = get_session_and_tables()

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

for race in range(1, event_props["races"] + 1):
    logging.info(f"RACE {race + 1}")
    race_props = prompt.Form({
        "map": prompt.Text(f"map name for race {race}"),
        "discipline": prompt.List(
            f"discipline for race {race}", {
                discipline.name: discipline.discipline_id for discipline in session.query(
                    tables.Discipline
                ).all()
            })
    }).execute()

    session.add(
        tables.Race(
            year=season,
            event_number=event_props["number"],
            number=race,
            map=race_props["map"],
            discipline_id=race_props["discipline"],
        ),
    )

commit_and_close(tunnel, session)
