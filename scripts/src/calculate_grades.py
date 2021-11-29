import logging
from datetime import date
from sys import stdin
from enum import Enum
from collections import Counter

from helpers.connection import commit_and_close, tables, session

logging.basicConfig(level=logging.INFO, format="")

MAX_POINTS = 25
MIN_POINTS = 10

seasons = session.query(tables.Season)
members = session.query(tables.Member)
grades = session.query(tables.Grade)

logging.info("available seasons:")
for season in seasons:
    logging.info(season.year)
while True:
    logging.info("season?")
    try:
        season = int(stdin.readline())
    except ValueError:
        logging.info("that is not a valid season.")
    else:
        if season in {field.year for field in seasons}:
            break
        logging.info("that is not a valid season.")

events = session.query(tables.Event).filter_by(season_idyear=season)
events_finished = sum([event.date <= date.today() for event in events])
events_to_go = events.count() - events_finished
events_needed_to_qualify = 3
events_needed_so_far_to_qualify = events_needed_to_qualify - events_to_go


class Eligibility(Enum):
    PEND = "Pending",
    INEL = "Ineligible",
    ELIG = "Eligible",
    QUAL = "Qualified"


session.query(tables.Points).delete()

for member in members:
    events_raced = len(
        set(session.query(tables.Result).filter_by(member_idmember=member.idmember)))
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
        grade = session.query(
            tables.Result).filter_by(
            race_event_season_idyear=season,
            race_event_number=event.number,
            member_idmember=member.idmember).first()
        if grade.count() == 0:
            continue
        oy_grades = session.query(
            tables.RaceGrade).filter_by(
            race_grade=grade.race_grade_race_grade,
            race_event_number=event.number)
        difficulty = 0
        selected_grade = None
        for oy_grade in oy_grades:
            grade_difficulty = session.query(
                tables.Grade).filter_by(
                gender=member.gender,
                idgrade=oy_grade.grade_idgrade).first()
            if grade_difficulty:  # does not exist if wrong gender
                if grade_difficulty.difficulty > difficulty:
                    difficulty = grade_difficulty.difficulty
                    selected_grade = oy_grade.grade_idgrade
        if selected_grade:
            member_oy_grades[selected_grade] += 1
    if member_oy_grades:
        session.merge(
            tables.MemberGrade(
                season_year=season,
                member_idmember=member.idmember,
                grade_idgrade=member_oy_grades.most_common(1)[0][0],
                eligibility_ideligibility=eligibility.name
            )
        )

commit_and_close()
