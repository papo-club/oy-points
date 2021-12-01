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

members = session.query(tables.Member).filter_by(year=season)
events = session.query(tables.Event).filter_by(year=season)
events_finished = sum([event.date <= date.today() for event in events])
events_to_go = events.count() - events_finished
events_needed_to_qualify = 3
events_needed_so_far_to_qualify = events_needed_to_qualify - events_to_go


class Eligibility(Enum):
    PEND = "Pending",
    INEL = "Ineligible",
    ELIG = "Eligible",
    QUAL = "Qualified"


session.query(tables.Points).filter_by(year=season).delete()

for member in members:
    events_raced = len(
        set(
            session.query(
                tables.EventAdmins.event_number).filter_by(
                member_id=member.member_id,
                year=season).all() +
            session.query(
                    tables.Result.event_number).filter_by(
                        member_id=member.member_id,
                        year=season).filter(
                            tables.Result.status != "DNS").filter(
                                tables.Result.status != "NT").all()))
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
        grades = session.query(
            tables.Result).filter_by(
            year=season,
            event_number=event.number,
            member_id=member.member_id).all()
        if not grades:
            continue
        for grade in grades:
            oy_grades = session.query(
                tables.RaceGrade).filter_by(
                race_grade=grade.race_grade,
                race_number=1,
                event_number=event.number, year=season)
            difficulty = 0
            for oy_grade in oy_grades:
                member_oy_grades[oy_grade.grade_id] += 1
    if member_oy_grades:

        most_races = member_oy_grades.most_common(1)[0][1]
        most_raced_grades = [
            member_oy_grade for member_oy_grade,
            count in member_oy_grades.items() if count == most_races]

        final_grade = None
        difficulty = 0
        for grade in most_raced_grades:
            standard_grade = session.query(tables.Grade).filter_by(
                grade_id=grade
            ).first()
            if standard_grade.difficulty > difficulty:
                difficulty = standard_grade.difficulty
                final_grade = standard_grade.grade_id

        session.merge(
            tables.MemberGrade(
                year=season,
                member_id=member.member_id,
                grade_id=standard_grade.grade_id,
                eligibility_id=eligibility.name
            )
        )

commit_and_close()
