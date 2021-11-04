import logging
from datetime import timedelta
from math import floor
from sys import stdin

from helpers.connection import commit_and_close, cursor, cursor_dict

logging.basicConfig(level=logging.INFO, format="")

MAX_POINTS = 25
MIN_POINTS = 10

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

cursor_dict.execute(
    "SELECT * from oypoints.event WHERE season_idyear=%s",
    [season],
)
events = cursor_dict.fetchall()
cursor.execute(
    "SELECT idgrade from oypoints.grade WHERE season_idyear=%s",
    [season],
)
grades = cursor.fetchall()


def _timesort(row: dict) -> timedelta:
    return row["time"] or timedelta(1, 0, 0)


for event in events:
    for grade in grades:
        cursor_dict.execute(
            "SELECT member_idmember, time"
            "FROM oypoints.result"
            "WHERE event_season_idyear=%s"
            "AND event_number=%s"
            "AND grade_idgrade=%s",
            [season, event["number"], grade[0]],
        )
        race_results = cursor_dict.fetchall()
        race_results.sort(key=_timesort)
        winner = race_results[0]
        for race_result in race_results:
            if race_result["time"]:
                points = max(
                    floor(MAX_POINTS * (winner["time"] / race_result["time"])),
                    MIN_POINTS,
                )
            else:
                points = MIN_POINTS
            cursor.execute(
                "REPLACE INTO oypoints.points VALUES (%s, %s, %s, %s, %s, %s)",
                [
                    points,
                    race_result["member_idmember"],
                    season,
                    event["number"],
                    grade[0],
                    season,
                ],
            )

commit_and_close()
