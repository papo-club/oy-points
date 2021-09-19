import sys


import prompt
from connection import Tables, session

print(" ℹ\uFE0F adding race to record...")
session.add(Tables.race(**prompt.Form({
    "year"         : prompt.List("season", [season.year for season in session.query(Tables.season).all()]),
    "event_number" : prompt.List("OY #", [oy.number for oy in session.query(Tables.event).all()]),
    "race_number"  : prompt.Int ("race # for this OY", validate=lambda x: 0 < int(x) < 99, default=1),
    "map_name"     : prompt.Text("map name"),
}).execute()))
session.commit()
session.close()
sys.exit()
