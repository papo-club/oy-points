import logging
from datetime import timedelta
from sys import stdin
from collections import Counter

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

cursor_dict.execute("SELECT * FROM oypoints.member")
members = cursor_dict.fetchall()

for member in members:
    cursor.execute(
        f"SELECT race_grade_grade_idgrade FROM oypoints.result WHERE race_grade_race_event_season_idyear={season} AND member_idmember={member['idmember']}")
    grades = [member[0] for member in cursor.fetchall()]
    if grades:
        grades = Counter(grades)
        cursor.execute("DELETE FROM oypoints.points")
        cursor.execute(
            "REPLACE INTO oypoints.member_grade "
            "VALUES (%s, %s, %s)",
            [season, member["idmember"], grades.most_common(1)[0][0]],
        )

commit_and_close()
