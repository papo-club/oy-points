import logging
from datetime import timedelta
from enum import Enum
from sys import stdin

from sqlalchemy import update, asc
from helpers.connection import commit_and_close, session, tables

logging.basicConfig(level=logging.INFO, format="")

MAX_POINTS = 25
MIN_POINTS = 10

seasons = session.query(tables.Season.year)

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

events = session.query(tables.Event).filter_by(season_idyear=season)
grades = session.query(tables.Grade.idgrade)


def _timesort(row: dict) -> timedelta:
    return row["time"] if row["status"] == "OK" else timedelta(1, 0, 0)


def _get_grade(competitor):
    return session.query(
        tables.MemberGrade.grade_idgrade).filter_by(
        member_idmember=competitor)


def _correct_grade(member, result):
    valid_grades = session.query(
        tables.RaceGrade.grade_idgrade).filter_by(
        race_event_season_idyear=season,
        race_event_number=result.race_event_number,
        race_number=result.race_number,
        race_grade=result.race_grade_race_grade)
    competitor_grade = _get_grade(member)
    return competitor_grade.first() in valid_grades.all()


class Derivation(Enum):
    CTRL = "Controller"
    DNF = "Did not finish"
    DNS = "Did not start"
    IW = "Ineligible win"
    MP = "Mispunched"
    NA = "Did not compete"
    OK = "Competed"
    NT = "No time"
    NW = "No winner"
    PLAN = "Planner"
    WG = "Wrong grade"
    WIN = "Winner"


session.query(tables.Points).delete()
for event in events:
    races = session.query(
        tables.Race).filter_by(
        event_season_idyear=season,
        event_number=event.number)
    # calculate winning time
    winners = {}
    for grade in grades:
        best_time = timedelta(1, 0, 0)
        worst_time = timedelta(0, 0, 0)
        best_points = 0
        grade_competitors = session.query(
            tables.MemberGrade.member_idmember).filter_by(
            season_year=season,
            grade_idgrade=grade.idgrade).filter(
            tables.MemberGrade.eligibility_ideligibility != "INEL")
        for grade_competitor in grade_competitors:
            race_grade = session.query(
                tables.RaceGrade.race_grade).filter_by(
                grade_idgrade=grade.idgrade,
                race_event_number=event.number).first()[0]
            competitor_results = session.query(
                tables.Result).filter_by(
                race_event_season_idyear=season,
                race_event_number=event.number,
                race_grade_race_grade=race_grade,
                member_idmember=grade_competitor.member_idmember).filter(
                tables.Result.status == "OK")
            if competitor_results.count() == 0:
                continue  # this grade competitor did not compete in this event
            if competitor_results.count() < races.count():
                continue  # competitor did not compete in all events or did not get OK in both events
            if races[0].discipline_iddiscipline == "SCO":
                if competitor_results[0].points > best_points:
                    best_points = competitor_results[0].points
                    best_time = timedelta(0, competitor_results[0].time, 0)
                if competitor_results[0].points == races[0].max_points:
                    if timedelta(
                            0,
                            competitor_results[0].time,
                            0) > worst_time:
                        worst_time = timedelta(
                            0, competitor_results[0].time, 0)
            else:
                time = timedelta(
                    0, sum([result.time for result in competitor_results if result.time]), 0)
                if time and time < best_time:
                    best_time = time
        if not best_time == timedelta(1, 0, 0):
            if races[0].discipline_iddiscipline == "SCO":
                winners[grade.idgrade] = {
                    "best": (best_points, best_time),
                    "worst": (best_points, worst_time) if worst_time else None
                }
            else:
                winners[grade.idgrade] = best_time

    # get all results
    results = session.query(
        tables.Result).filter_by(
        race_event_season_idyear=season,
        race_event_number=event.number)
    competing_members = {*[result.member_idmember for result in results]}
    for member in competing_members:

        # get all results for member
        member_all_results = session.query(
            tables.Result).filter_by(
            race_event_season_idyear=season,
            race_event_number=event.number,
            member_idmember=member)
        member_results = []
        for race in races:
            for result in member_all_results:
                if result.race_number == race.number and _correct_grade(member, result) and not len(
                        [res for res in member_results if res.race_number == race.number]):
                    member_results.append(result)
        if len({*[result.race_number
               for result in member_all_results]}) < races.count():
            derivation = Derivation.NA  # both races not attempted
            points = MIN_POINTS
        elif len(member_results) < races.count():
            derivation = Derivation.WG  # wrong grade in an event
            points = MIN_POINTS
        elif True in [result.status ==
                      "DNS" for result in member_results]:
            derivation = Derivation.DNS  # dns in an event
            points = None
            continue  # throw away DNS
        elif False in [result.status ==  # non ok-status in an event
                       "OK" for result in member_results]:
            for result in member_results:
                if result.status != "OK":
                    derivation = getattr(Derivation, result.status)
                    points = MIN_POINTS
        else:  # all good :)
            try:
                winner = winners[_get_grade(member).first()[0]]
                time = timedelta(0, sum([
                    result.time for result in member_results if result.time
                ]), 0)
            except KeyError:
                points = 0
                derivation = Derivation.NW
            else:
                if races[0].discipline_iddiscipline == "SCO":
                    if winner["best"][0] == races[0].max_points:
                        if member_results[0].points == races[0].max_points:
                            points = max(
                                round(
                                    MAX_POINTS * (winner["best"][1] / time), 1

                                ), MIN_POINTS,
                            )  # scaled by time if same points
                        else:
                            slowest_competitor_points = max(
                                round(
                                    MAX_POINTS *
                                    (winner["best"][1] /
                                     winner["worst"][1]), 1

                                ), MIN_POINTS,
                            )  # scaled by time if same points
                            points = max(
                                round(
                                    slowest_competitor_points *
                                    (member_results[0].points / races[0].max_points
                                     ),
                                    2),
                                MIN_POINTS)
                    else:
                        points = max(
                            round(
                                MAX_POINTS *
                                (member_results[0].points / winner["best"][0]),
                                1,
                            ), MIN_POINTS,
                        )
                else:
                    points = max(
                        round(
                            MAX_POINTS *
                            (winner / time),
                            1,
                        ),
                        MIN_POINTS,
                    )
                if points == MAX_POINTS:
                    derivation = Derivation.WIN
                if points >= MAX_POINTS:
                    eligibility = session.query(
                        tables.MemberGrade.eligibility_ideligibility).filter_by(
                        member_idmember=member).first()
                    if eligibility.eligibility_ideligibility == "INEL":
                        derivation = Derivation.IW
                    else:
                        if points > MAX_POINTS:
                            raise Exception("Maximum points exceeded")
                else:
                    derivation = Derivation.OK

        session.merge(tables.Points(
            member_grade_season_year=season,
            member_grade_member_idmember=member,
            event_season_idyear=season,
            event_number=event.number,
            points_derivation_idpoints_derivation=derivation.name,
            points_generated=points,
            counts_towards_total=True
        ))

    admins = session.query(
        tables.EventAdmins).filter_by(
        event_season_idyear=season,
        event_number=event.number)
    for admin in admins:
        if session.query(tables.MemberGrade).filter_by(member_idmember=admin.member_idmember).count(
        ):  # need to test whether admin has competed in oy year yet
            # if they have not then cannot assign grade, not in competition

            session.merge(
                tables.Points(
                    member_grade_season_year=season,
                    member_grade_member_idmember=admin.member_idmember,
                    event_season_idyear=season,
                    event_number=event.number,
                    points_derivation_idpoints_derivation=admin.admin_roles_idadmin_roles,
                    points_generated=MAX_POINTS,
                    counts_towards_total=True))
# assign whether points count towards the total or not.

members = session.query(tables.Member.idmember)
events = session.query(tables.Event).filter_by(season_idyear=season)
counts_towards_total = {
    1: 1,
    2: 1,
    3: 2,
    4: 3,
    5: 4,
    6: 4,
    7: 5,
    8: 5
}
for member in members:
    results = session.query(
        tables.Points).filter_by(
        member_grade_member_idmember=member[0]).all()
    results.sort(key=lambda result: result.points_generated or 0, reverse=True)
    for i, result in enumerate(results):
        if i >= counts_towards_total[events.count()]:
            session.execute(
                update(
                    tables.Points).where(
                    tables.Points.member_grade_season_year == result.member_grade_season_year).where(
                    tables.Points.member_grade_member_idmember == result.member_grade_member_idmember).where(
                    tables.Points.event_number == result.event_number).where(
                        tables.Points.points_derivation_idpoints_derivation == result.points_derivation_idpoints_derivation).values(
                            counts_towards_total=False))


commit_and_close()
