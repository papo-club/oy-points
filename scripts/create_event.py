import sys

import prompt
from connection import Tables, session

print(" ℹ\uFE0F adding race to record...")
session.add(Tables.event(**prompt.Form({
    "year"         : prompt.List("season", [season.year for season in session.query(Tables.season).all()]),
    "number"       : prompt.Int ("OY #", validate=lambda x: 0 < int(x) < 99),
    "name"     : prompt.Text("special event name (press enter for none)", default=None),
    "date"         : prompt.Date("date"),
    "event_type"   : prompt.List("event type", [event_type.id for event_type in session.query(Tables.event_types).all()])
}).execute()))
session.commit()
session.close()
sys.exit()
