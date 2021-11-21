import logging
from datetime import date
from sys import exec_prefix, stdin
from enum import Enum
from collections import Counter

from helpers.connection import commit_and_close, cursor, cursor_dict

logging.basicConfig(level=logging.INFO, format="")

MAX_POINTS = 25
MIN_POINTS = 10

cursor_dict.execute("SELECT year, events FROM oypoints.season")
seasons = cursor_dict.fetchall()

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

cursor_dict.execute("SELECT * FROM oypoints.member")
members = cursor_dict.fetchall()
cursor.execute("SELECT idgrade FROM oypoints.grade")
grades = [grade[0] for grade in cursor.fetchall()]
cursor_dict.execute(
    "SELECT number, date FROM oypoints.event WHERE season_idyear=%s", (season,))
events = cursor_dict.fetchall()

events_this_year = len(events)
events_finished = sum([event["date"] <= date.today() for event in events])
events_to_go = events_this_year - events_finished
events_needed_to_qualify = 3
events_needed_so_far_to_qualify = events_needed_to_qualify - events_to_go


class Eligibility(Enum):
    PEND = "Pending",
    INEL = "Ineligible",
    ELIG = "Eligible",
    QUAL = "Qualified"


cursor.execute("DELETE FROM oypoints.points")

for member in members:
    cursor.execute(
        "SELECT race_event_number from oypoints.result WHERE member_idmember=%s",
        (member["idmember"],
         ))
    events_raced = len(set([event[0] for event in cursor.fetchall()]))
    if events_raced < events_needed_so_far_to_qualify:
        eligibility = Eligibility.INEL
    elif events_raced >= events_needed_to_qualify:
        eligibility = Eligibility.QUAL
    else:
        eligibility = Eligibility.PEND

        # only get OY grades not mtbo or score grades
      # member has only competed in non OY grade races
    member_oy_grades = Counter()
    for event in events:
        cursor.execute(
            "SELECT race_grade_race_grade from oypoints.result "
            "WHERE race_event_season_idyear=%s AND "
            "race_event_number=%s AND "
            "member_idmember=%s", [
                season, event["number"], member["idmember"]])
        try:
            grade = cursor.fetchall()[0][0]
        except IndexError:
            continue
        cursor.execute(
            "SELECT grade_idgrade FROM oypoints.race_grade WHERE race_grade=%s and race_event_number=%s", [
                grade, event["number"]])
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
        if selected_grade:
            member_oy_grades[selected_grade] += 1
    if member_oy_grades:
        cursor.execute(
            "REPLACE INTO oypoints.member_grade "
            "VALUES (%s, %s, %s, %s)",
            [season,
             member["idmember"],
             member_oy_grades.most_common(1)[0][0],
             eligibility.name])

commit_and_close()
