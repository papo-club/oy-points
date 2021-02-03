import sys

import prompt
from connection import Race, Season, session

print(" ℹ\uFE0F adding race to record...")
session.add(Race(**prompt.Form({
    "year"         : prompt.List("season", [season.year for season in session.query(Season).all()]),
    "event_number" : prompt.Int ("OY #", validate=lambda x: 0 < int(x) < 99),
    "race_number"  : prompt.Int ("race # for this OY", validate=lambda x: 0 < int(x) < 99, default=1),
    "map_name"     : prompt.Text("race name"),
    "date"         : prompt.Date("race date")
}).execute()))
session.commit()
session.close()
sys.exit()
