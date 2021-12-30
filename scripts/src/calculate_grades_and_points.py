import logging
from collections import Counter
from datetime import date, timedelta
from enum import Enum
from statistics import mean

from sqlalchemy import update

from helpers.args import get_season
from helpers.connection import commit_and_close, session, tables

logging.basicConfig(level=logging.INFO, format="")

season = get_season()
season_info = session.query(tables.Season).filter_by(year=season).first()
MAX_POINTS = season_info.max_points
MIN_POINTS = season_info.min_points
MIN_TIME_POINTS = season_info.min_time_points


class Eligibility(Enum):
    PEND = "Pending"
    INEL = "Ineligible"
    ELIG = "Eligible"
    QUAL = "Qualified"


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
    UP = "Up a grade"


class Grade(Enum):
    UP = 2
    CORRECT = 1
    WRONG = 0


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


def _get_grade(competitor):
    return session.query(
        tables.MemberGrade).filter_by(
        member_id=competitor,
        year=season)


def _correct_grade(member, result):
    valid_grades = session.query(tables.RaceGrade).filter_by(
        year=season,
        event_number=result.event_number,
        race_number=result.race_number,
        race_grade=result.race_grade)
    competitor_grade = _get_grade(member).first().grade_id
    if competitor_grade in [
            grade.grade_id for grade in valid_grades]:
        return Grade.CORRECT
    else:
        competitor_grade_difficulty = session.query(
            tables.Grade).filter_by(
            grade_id=competitor_grade).first().difficulty
        result_grade_difficulty = mean([session.query(tables.Grade).filter_by(
            grade_id=grade.grade_id).first().difficulty for grade in valid_grades])
        if result_grade_difficulty > competitor_grade_difficulty:
            return Grade.UP
        return Grade.WRONG


session.query(tables.Points).filter_by(year=season).delete()
session.query(tables.MemberGrade).filter_by(year=season).delete()

events = session.query(tables.Event).filter_by(year=season)
members = session.query(tables.Member).filter_by(year=season)
grades = session.query(tables.Grade)
events_finished = sum([event.date <= date.today() for event in events])
events_to_go = events.count() - events_finished
events_needed_to_qualify = 3
events_needed_so_far_to_qualify = events_needed_to_qualify - events_to_go

logging.info("Assigning grades to members...")
for member in members:
    this_member = {
        "member_id": member.member_id,
        "year": season
    }
    events_raced = len(set(
        session.query(
            tables.EventAdmins.event_number).filter_by(**this_member).all() +
        session.query(
            tables.Result.event_number).filter_by(**this_member).filter(
            tables.Result.status != "DNS").filter(
            tables.Result.status != "NT").all()
    ))

    # set eligibility status
    if events_raced < events_needed_so_far_to_qualify:
        eligibility = Eligibility.INEL
    elif events_raced >= events_needed_to_qualify:
        eligibility = Eligibility.QUAL
    else:
        eligibility = Eligibility.PEND

    # get most commonly raced oy grade for each member through race grades
    member_oy_grades = Counter()
    for event in events:
        # get all race grades member has competed in for the season
        race_grades = session.query(tables.Result).filter_by(
            **this_member,
            event_number=event.number,
        ).all()
        for race_grade in race_grades:
            # for each race grade, get all possible oy grades
            oy_grades = session.query(
                tables.RaceGrade).filter_by(
                race_grade=race_grade.race_grade,
                race_number=1,
                event_number=event.number, year=season)
            # increase counter for each oy grade
            for oy_grade in oy_grades:
                member_oy_grades[oy_grade.grade_id] += 1
    # abort if competitor has not competed in any events
    if not member_oy_grades:
        continue

    # get count the most races done in one grade
    most_races_in_one_grade = member_oy_grades.most_common(1)[0][1]
    # get list of all grades where this amount of races has been done
    most_raced_grades = [
        member_oy_grade for member_oy_grade,
        count in member_oy_grades.items() if count == most_races_in_one_grade]

    member_grade = None
    hardest_grade_difficulty = 0
    for grade in most_raced_grades:
        # get grade from grade id
        grade = session.query(tables.Grade).filter_by(
            grade_id=grade
        ).first()
        # set final grade to most difficult grade
        if grade.difficulty > hardest_grade_difficulty:
            hardest_grade_difficulty = grade.difficulty
            member_grade = grade

    # set member grade and eligibility
    session.merge(
        tables.MemberGrade(
            **this_member,
            grade_id=member_grade.grade_id,
            eligibility_id=eligibility.name
        )
    )

for event in events:
    logging.info(f"Assigning winning times for OY{event.number}...")
    # get races in event
    races = session.query(
        tables.Race).filter_by(
        year=season,
        event_number=event.number)
    is_score = False
    score_race = None
    if "SCO" in [race.discipline_id for race in races]:
        if races.count() == 1:
            is_score = True
            score_race = races[0]
        else:
            # a score event must only show up when there is only 1 race
            # in the event
            raise Exception(
                "Cannot have a score race as part of a multiple race event")
    winners = {}
    # for each grade find winning time
    for grade in grades:
        # get race grade associated with this oy grade
        race_grade = session.query(
            tables.RaceGrade.race_grade).filter_by(
            grade_id=grade.grade_id,
            event_number=event.number, year=season).first()[0]
        best_time = timedelta(1, 0, 0)
        worst_time = timedelta(0, 0, 0)
        best_points = 0
        # get all eligibile competitors in this event in the current grade
        grade_competitors = session.query(
            tables.MemberGrade.member_id).filter_by(
            year=season,
            grade_id=grade.grade_id).filter(
            tables.MemberGrade.eligibility_id != "INEL")
        for grade_competitor in grade_competitors:
            # for each competitor get their results for all races in the event
            competitor_results = session.query(
                tables.Result).filter_by(
                year=season,
                event_number=event.number,
                race_grade=race_grade,
                member_id=grade_competitor.member_id).filter(
                tables.Result.status == "OK")
            if competitor_results.count() < races.count():
                # competitor did not compete in all events or did not get OK in both events
                # so cannot be considered for winning this grade
                continue
            if is_score:
                # event is score event
                score_result = competitor_results[0]
                score_result_time = timedelta(0, score_result.time, 0)
                # if the competitors points equal the max points
                # set best and worst times accordingly
                if score_result.points == score_race.max_points:
                    # if max points score has not yet been set, reset best time
                    if best_points < score_race.max_points:
                        best_time = timedelta(1, 0, 0)
                    best_points = score_race.max_points
                    if score_result_time < best_time:
                        best_time = score_result_time
                    if score_result_time > worst_time:
                        worst_time = score_result_time
                # otherwise set best points and times off result
                elif score_result.points > best_points:
                    best_points = score_result.points
                    best_time = score_result_time
            else:
                # event is not a score event
                # time is calculated by total time across all races
                time = timedelta(
                    0, sum([result.time for result in competitor_results if result.time]), 0)
                if time and time < best_time:
                    best_time = time
        # if a best time exists...
        if not best_time == timedelta(1, 0, 0):
            # set best and worst times
            if is_score:
                winners[grade.grade_id] = {
                    "best": (best_points, best_time),
                    "worst": (best_points, worst_time) if worst_time else None
                }
            # set best time
            else:
                winners[grade.grade_id] = best_time

    logging.info(f"Assigning points for OY{event.number}...")
    # get all results for event
    results = session.query(
        tables.Result).filter_by(
        year=season,
        event_number=event.number)
    # create set of all members in results
    competing_members = {*[result.member_id for result in results]}
    for member in competing_members:

        # get all results for member
        all_member_results = session.query(
            tables.Result).filter_by(
            year=season,
            event_number=event.number,
            member_id=member)

        member_results = []
        for race in races:
            # get member results for this race
            member_race_results = all_member_results.filter_by(
                race_number=race.number)
            # if there are results
            if member_race_results.count():
                # choose first result in correct grade
                result = [
                    result for result in member_race_results.all() if _correct_grade(
                        member, result) == Grade.CORRECT]
                if not result:
                    result = [
                        result for result in member_race_results.all() if _correct_grade(
                            member, result) == Grade.UP]
                if not result:
                    # if still no result choose first wrong grade result
                    result = member_race_results.all()
                member_results.append(result[0])
        if not member_results:
            raise Exception()
        competed_results = [
            result.status not in (
                "NT", "DNS") for result in member_results]
        # no results
        if True not in competed_results:
            points = 0
            if "NT" in [result.status for result in member_results]:
                derivation = Derivation.NT
            else:
                derivation = Derivation.DNS
        # check that member competed at least 1 race
        elif False in competed_results or len(member_results) < races.count():
            derivation = Derivation.NA
            points = MIN_POINTS
        # check that member got OK status for all races
        elif False in [result.status ==
                       "OK" for result in member_results]:
            for result in member_results:
                if result.status != "OK":
                    derivation = getattr(Derivation, result.status)
                    points = MIN_POINTS
        # check that member competed in all races in correct grade
        else:
            for result in member_results:
                if not (
                    grade_status := _correct_grade(
                        member,
                        result)) == Grade.CORRECT:
                    if grade_status == Grade.UP:
                        derivation = Derivation.UP
                        points = MIN_TIME_POINTS
                        break
                    else:
                        derivation = Derivation.WG
                        points = MIN_POINTS
                        break
            else:
                try:
                    # get winner
                    winner = winners[_get_grade(member).first().grade_id]
                    time = timedelta(0, sum([
                        result.time for result in member_results if result.time
                    ]), 0)
                except KeyError:
                    # no winner
                    points = 0
                    derivation = Derivation.NW
                else:
                    if is_score:
                        member_result = member_results[0]
                        # if max points was reached
                        if winner["best"][0] == score_race.max_points:
                            if member_result.points == score_race.max_points:
                                # if this competitor also reached max points scale
                                # by time
                                points = MAX_POINTS * \
                                    (winner["best"][1] / time)
                            else:
                                # competitor did not reach max points
                                # scale by slowest competitor time * points
                                slowest_competitor_points = max(
                                    round(
                                        MAX_POINTS * (winner["best"][1] /
                                                      winner["worst"][1]), 1
                                    ), MIN_TIME_POINTS)
                                points = slowest_competitor_points * \
                                    (member_results[0].points / races[0].max_points)
                        else:
                            # max points not reached in this score, scale by
                            # points
                            points = MAX_POINTS * \
                                (member_results[0].points / winner["best"][0])
                    else:
                        # not a score event, scale by time
                        points = MAX_POINTS * (winner / time)
                    # if points < minimum points, set to minimum
                    points = max(round(points, 1), MIN_TIME_POINTS)
                    # if competitor received maximum points, set to winner
                    if points == MAX_POINTS:
                        derivation = Derivation.WIN
                    # if competitor recieved more than maximum points
                    if points >= MAX_POINTS:
                        # check eligibility of competitor
                        eligibility = session.query(
                            tables.MemberGrade.eligibility_id).filter_by(
                                year=season,
                            member_id=member).first()
                        if eligibility.eligibility_id == "INEL":
                            # inelegibile win
                            derivation = Derivation.IW
                        else:
                            # something went wrong if competitor is
                            # eligible
                            if points > MAX_POINTS:
                                raise Exception("Maximum points exceeded")
                    else:
                        derivation = Derivation.OK

        # add points
        session.merge(tables.Points(
            year=season,
            member_id=member,
            event_number=event.number,
            points_derivation_id=derivation.name,
            points_generated=points,
            counts_towards_total=True
        ))

    # get all event admins
    admins = session.query(
        tables.EventAdmins).filter_by(
        year=season,
        event_number=event.number)
    for admin in admins:
        # session.query(tables.Points).filter_by(
        #     year=season,
        #     event_number=event.number,
        #     member_id=admin.member_id
        # ).delete()  # if the admin set/controlled event, delete their existing points
        # test whether admin has competed in oy year yet
        if session.query(
                tables.MemberGrade).filter_by(
                member_id=admin.member_id,
                year=season).count():
            # if they have, they can receive admin points
            session.merge(
                tables.Points(
                    year=season,
                    member_id=admin.member_id,
                    event_number=event.number,
                    points_derivation_id=admin.admin_role_id,
                    points_generated=MAX_POINTS,
                    counts_towards_total=True))

logging.info(f"Assigning top 5 points to totals...")

for member in members:
    # get all points for member
    results = session.query(
        tables.Points).filter_by(year=season,
                                 member_id=member.member_id).all()
    results.sort(key=lambda result: result.points_generated or 0, reverse=True)
    # sort by highest
    for i, result in enumerate(results):
        # if the index is created than the amount of events that count
        # towards the total, update counts_towards_total to false
        if i >= counts_towards_total[events.count()]:
            session.execute(
                update(
                    tables.Points).where(
                    tables.Points.year == result.year).where(
                    tables.Points.member_id == result.member_id).where(
                    tables.Points.event_number == result.event_number).where(
                        tables.Points.points_derivation_id == result.points_derivation_id).values(
                            counts_towards_total=False))


commit_and_close()
