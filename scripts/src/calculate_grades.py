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
cursor.execute("SELECT idgrade FROM oypoints.grade")
grades = [grade[0] for grade in cursor.fetchall()]

for member in members:
    cursor.execute(
        f"SELECT race_grade_race_grade FROM oypoints.result WHERE race_event_season_idyear={season} AND member_idmember={member['idmember']}")
    member_grades = [member[0] for member in cursor.fetchall()]
    if member_grades:
        # only get OY grades not mtbo or score grades
        member_oy_grades = [
            member_grade for member_grade in member_grades if member_grade in grades]
        if member_oy_grades:
            member_oy_grades = Counter(member_grades)
            cursor.execute("DELETE FROM oypoints.points")
            cursor.execute(
                "REPLACE INTO oypoints.member_grade "
                "VALUES (%s, %s, %s)",
                [season, member["idmember"], member_oy_grades.most_common(1)[0][0]],
            )
        else:       # member has only competed in non OY grade races
            cursor.execute(
                "SELECT grade_idgrade FROM oypoints.race_grade WHERE race_grade=%s", [
                    member_grades[0]])
            oy_grades = [grade[0] for grade in cursor.fetchall()]
            difficulty = 0
            selected_grade = None
            for oy_grade in oy_grades:
                cursor.execute(
                    "SELECT difficulty FROM oypoints.grade WHERE gender=%s "
                    "AND idgrade=%s",
                    [member["gender"], oy_grade])
                grade_difficulty = cursor.fetchall()
                if grade_difficulty:  # does not exist if wrong gender
                    if grade_difficulty[0][0] > difficulty:
                        difficulty = grade_difficulty[0][0]
                        selected_grade = oy_grade
            cursor.execute(
                "REPLACE INTO oypoints.member_grade "
                "VALUES (%s, %s, %s)",
                [season, member["idmember"], selected_grade])

commit_and_close()
