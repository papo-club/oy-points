import logging
from datetime import timedelta
from sys import stdin
from enum import Enum
from collections import Counter
from functools import reduce
from datetime import timedelta
from typing import Match

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
    "SELECT idgrade from oypoints.grade",
)
grades = cursor.fetchall()


def _timesort(row: dict) -> timedelta:
    return row["time"] if row["status"] == "OK" else timedelta(1, 0, 0)


def _get_grade(competitor):
    cursor.execute(
        "SELECT grade_idgrade from oypoints.member_grade WHERE member_idmember=%s",
        [competitor],
    )
    return cursor.fetchall()[0]


def _correct_grade(member, result):
    cursor.execute("SELECT grade_idgrade from oypoints.race_grade WHERE "
                   "race_event_season_idyear=%s AND "
                   "race_event_number=%s AND "
                   "race_number=%s AND "
                   "race_grade=%s",
                   [season,
                    result["race_event_number"],
                    result["race_number"],
                    result["race_grade_race_grade"]])
    valid_grades = [grade[0] for grade in cursor.fetchall()]
    competitor_grade = _get_grade(member)[0]
    return competitor_grade in valid_grades


class Derivation(Enum):
    CTRL = "Controller"
    DNF = "Did not finish"
    DNS = "Did not start"
    MP = "Mispunched"
    NA = "Did not compete"
    OK = "Competed"
    PLAN = "Planner"
    WG = "Wrong grade"
    WIN = "Winner"


cursor.execute("SELECT idgrade from oypoints.grade")
grades = [grade[0] for grade in cursor.fetchall()]

cursor.execute("DELETE FROM oypoints.points")
for event in events:
    cursor_dict.execute(
        "SELECT discipline_iddiscipline, number, max_points from oypoints.race WHERE event_season_idyear=%s AND event_number=%s", [
            season, event["number"]])
    races = cursor_dict.fetchall()
    # calculate winning time
    winners = {}
    for grade in grades:
        best_time = timedelta(1, 0, 0)
        worst_time = timedelta(0, 0, 0)
        best_points = 0
        cursor.execute(
            "SELECT member_idmember from oypoints.member_grade WHERE season_year=%s AND grade_idgrade=%s", [
                season, grade])
        grade_competitors = [member[0] for member in cursor.fetchall()]
        for grade_competitor in grade_competitors:
            cursor_dict.execute(
                "SELECT time, points FROM oypoints.result "
                "WHERE race_event_season_idyear=%s "
                "AND race_event_number=%s "
                "AND member_idmember=%s "
                "AND status='OK'", [
                    season, event["number"], grade_competitor])
            competitor_results = cursor_dict.fetchall()
            if not competitor_results:
                continue  # this grade competitor did not compete in this event
            if len(competitor_results) < len(races):
                continue  # competitor did not compete in all events or did not get OK in both events
            if races[0]["discipline_iddiscipline"] == "SCO":
                if competitor_results[0]["points"] >= best_points:
                    best_points = competitor_results[0]["points"]
                    best_time = competitor_results[0]["time"]
                if competitor_results[0]["points"] == races[0]["max_points"]:
                    if competitor_results[0]["time"] > worst_time:
                        worst_time = competitor_results[0]["time"]
            else:
                time = sum([result["time"]
                            for result in competitor_results], timedelta(0, 0, 0))
                if time < best_time:
                    best_time = time
        if races[0]["discipline_iddiscipline"] == "SCO":
            winners[grade] = {
                "best": (best_points, best_time),
                "worst": (best_points, worst_time) if worst_time else None
            }
        else:
            winners[grade] = best_time

    # get all results
    cursor_dict.execute(
        "SELECT member_idmember, race_number, race_grade_race_grade, time, status "
        "FROM oypoints.result "
        "WHERE race_event_season_idyear=%s "
        "AND race_event_number=%s ", [
            season, event["number"]], )
    results = cursor_dict.fetchall()
    competing_members = {*[result["member_idmember"] for result in results]}
    for member in competing_members:

        # get all results for member
        cursor_dict.execute(
            "SELECT race_event_number, race_number, race_grade_race_grade, time, status, points FROM oypoints.result "
            "WHERE race_event_season_idyear=%s "
            "AND race_event_number=%s "
            "AND member_idmember=%s", [
                season, event["number"], member],)
        member_results = cursor_dict.fetchall()
        if len(member_results) < len(races):
            derivation = Derivation.NA  # both races not attempted
            points = None
        elif False in [_correct_grade(member, result) for result in member_results]:
            derivation = Derivation.WG  # wrong grade in an event
            points = MIN_POINTS
        elif True in [result["status"] ==
                      "DNS" for result in member_results]:
            derivation = Derivation.DNS  # dns in an event
            points = False
        elif False in [result["status"] ==  # non ok-status in an event
                       "OK" for result in member_results]:
            for result in member_results:
                if result["status"] != "OK":
                    derivation = getattr(Derivation, result["status"])
                    points = MIN_POINTS
        else:  # all good :)
            if races[0]["discipline_iddiscipline"] == "SCO":
                if winners[_get_grade(member)[0]
                           ]["best"][0] == races[0]["max_points"]:
                    if member_results[0]["points"] == races[0]["max_points"]:
                        time = sum([result["time"]
                                    for result in member_results], timedelta(0, 0, 0))
                        points = max(
                            round(
                                MAX_POINTS * winners[_get_grade(member)[0]]["best"][1] / time, 2

                            ), MIN_POINTS,
                        )  # scaled by time if same points
                    else:
                        slowest_competitor_points = max(
                            round(
                                MAX_POINTS * winners[_get_grade(member)[0]]["worst"][1] / time, 2

                            ), MIN_POINTS,
                        )  # scaled by time if same points
                        points = max(
                            round(
                                slowest_competitor_points *
                                races[0]["max_points"] /
                                member_results[0]["points"],
                                2),
                            MIN_POINTS)
                else:
                    points = max(
                        round(
                            MAX_POINTS *
                            (member_results[0]["points"] / winners[_get_grade(member)[0]]["best"][0]),
                            2,
                        ), MIN_POINTS,
                    )

            else:
                time = sum([result["time"]
                            for result in member_results], timedelta(0, 0, 0))

                points = max(
                    round(
                        MAX_POINTS *
                        (winners[_get_grade(member)[0]] / time),
                        2,
                    ),
                    MIN_POINTS,
                )
            if points == MAX_POINTS:
                derivation = Derivation.WIN
            else:
                derivation = Derivation.OK

        cursor.execute("REPLACE INTO oypoints.points VALUES (%s, %s, %s, %s, %s, %s)", [
            season, member, season, event["number"],
            points, derivation.name])

    cursor_dict.execute(
        "SELECT member_idmember, admin_roles_idadmin_roles FROM oypoints.event_admins WHERE event_season_idyear=%s AND event_number=%s", [
            season, event["number"]])
    admins = cursor_dict.fetchall()
    for admin in admins:
        cursor.execute(
            "SELECT * from oypoints.member_grade WHERE member_idmember=%s", [admin["member_idmember"]])
        if len(cursor.fetchall()
               ):  # need to test whether admin has competed in oy year yet
            # if they have not then cannot assign grade, not in competition
            cursor.execute(
                "REPLACE INTO oypoints.points VALUES (%s, %s, %s, %s, %s, %s)",
                [
                    season,
                    admin["member_idmember"],
                    season,
                    event["number"],
                    MAX_POINTS,
                    admin["admin_roles_idadmin_roles"]])


commit_and_close()
