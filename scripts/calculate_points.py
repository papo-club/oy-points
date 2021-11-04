import logging
from sys import stdin
from math import floor
from datetime import timedelta

from helpers.connection import commit_and_close, cursor, cursor_dict

logging.basicConfig(level=logging.INFO, format="")

cursor.execute("SELECT year FROM oypoints.season")
seasons = cursor.fetchall()

logging.info("available seasons:")
for season in seasons:
    logging.info(season[0])
while True:
    logging.info("season?")
    try:
        season = int(stdin.readline())
    except ValueError:
        logging.info("that is not a valid season.")
    else:
        if season in {field[0] for field in seasons}:
            break
        logging.info("that is not a valid season.")

cursor_dict.execute("SELECT * from oypoints.event WHERE season_idyear=%s", [season])
events = cursor_dict.fetchall()
cursor.execute("SELECT idgrade from oypoints.grade WHERE season_idyear=%s", [season])
grades = cursor.fetchall()
for event in events:
    for grade in grades:
        cursor_dict.execute("SELECT member_idmember, time FROM oypoints.result WHERE event_season_idyear=%s AND event_number=%s AND grade_idgrade=%s", [season, event["number"], grade[0]])
        results = cursor_dict.fetchall()
        results.sort(key=lambda result: result["time"] or timedelta(1, 0, 0))
        winner = results[0]
        for result in results:
            if result["time"]:
                points = max(floor(25 * (winner["time"] / result["time"])), 10)
            else:
                points = 10
            cursor.execute(
                "REPLACE INTO oypoints.points VALUES (%s, %s, %s, %s, %s, %s)",
                [points, result["member_idmember"], season, event["number"], grade[0], season]
            )
            
commit_and_close()