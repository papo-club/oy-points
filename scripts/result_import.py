import logging
from csv import DictReader
from datetime import date, timedelta, datetime
from os import path
from sys import argv, stdin
from typing import Optional

from fuzzywuzzy import fuzz, process  # type: ignore

from helpers.connection import cursor_dict, commit_and_close

logging.basicConfig(level=logging.WARNING, format="")
csv_path = path.join(path.dirname(__file__), "..", argv[1])


LIKELY_MATCH = 0.9
POSSIBLE_MATCH = 0.7


class _Match(object):

    def __init__(self, name: str, score: int) -> None:
        self.name = name
        self.score = score

    def is_certain(self) -> bool:
        return self.score >= 100

    def is_likely(self) -> bool:
        return self.score >= (LIKELY_MATCH * 100)

    def is_possible(self) -> bool:
        return self.score >= (POSSIBLE_MATCH * 100)


class _Person(object):
    def __init__(
        self,
        first_name: str,
        last_name: str,
        gender: str,
    ) -> None:
        self.first_name = first_name
        self.last_name = last_name
        self.gender = gender

    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    def __str__(self) -> str:
        return self.full_name()


class _Competitor(_Person):
    def __init__(
            self,
            first_name: str,
            last_name: str,
            dob: Optional[date],
            gender: str,
            grade: str,
            time: Optional[timedelta],
    ) -> None:
        super().__init__(first_name, last_name, gender)
        self.dob = dob if dob else None
        self.grade = grade
        self.time = time


class _Member(_Person):
    def __init__(
            self,
            first_name: str,
            last_name: str,
            dob: date,
            gender: str,
            memberid: int,
    ) -> None:
        super().__init__(first_name, last_name, gender)
        self.dob = dob
        self.memberid = memberid


def _get_member_from_match(
        members_list: list[_Member],
        match: _Match,
) -> _Person:
    for member in members_list:
        if member.full_name() == match.name:
            return member
    raise ValueError


def _commit_member(member: _Member, competitor: _Competitor) -> None:
    cursor_dict.execute(
        ("REPLACE INTO oypoints.result "
         "VALUES (%s, %s, %s, %s, %s, %s)"),
        (member.memberid,
         competitor.time,
         selected_event["season_idyear"],
         selected_event["number"],
         competitor.grade,
         selected_event["season_idyear"],
         ))


def _find_possible_match() -> None:
    for match in matches:
        member = _get_member_from_match(members, match)
        gender_matches = member.gender == competitor.gender
        if competitor.dob:
            dob_matches = member.dob.year == competitor.dob.year
            # now can check for details and match more confidently
            if dob_matches and gender_matches:
                if match.is_likely():
                    # all details match and names are close so add
                    logging.info(
                        "ADD:  perfect match found for "
                        f"competitor {competitor}",
                    )
                    _commit_member(member, competitor)
                elif match.is_possible():
                    # all details match but names are not so close
                    # add with warning
                    logging.warning(
                        f"ADD:  match between {competitor} and {member} "
                        "is not certain, but DOB and gender "
                        f"match ({match.score})",
                    )
                    _commit_member(member, competitor)
                break
            else:
                # details do not match
                if match.is_likely():
                    logging.warning(
                        f"OMIT: details between {competitor} and {member} "
                        "do not match",
                    )
        else:
            # no dob, can match less confidently
            if match.is_likely() and gender_matches:
                # names are close but no details to back up
                # add with warning
                logging.warning(
                    f"ADD:  match between {competitor} and {member} "
                    f"is not certain, but gender matches ({match.score})",
                )
                _commit_member(member, competitor)
                break
            if match.is_possible() and gender_matches:
                # names are less close and no details to back up
                # omit with warning
                logging.warning(
                    f"OMIT: match between {competitor} and {member} "
                    f"is close ({match.score})",
                )


def _certain_match() -> None:
    member = _get_member_from_match(members, top_match)

    gender_matches = member.gender == competitor.gender

    dob_matches = True
    if competitor.dob:
        assert member.dob is not None
        dob_matches = member.dob.year == competitor.dob.year

    if dob_matches and gender_matches:
        logging.info(f"ADD:  competitor {competitor}")
        _commit_member(member, competitor)
    else:
        logging.warning(
            f"ADD:  details of {competitor} "
            "do not match with the members database "
            f"(DoB:{dob_matches} S:{gender_matches})",
        )
        _commit_member(member, competitor)


cursor_dict.execute("SELECT * FROM oypoints.event")
events = cursor_dict.fetchall()

logging.critical("select event: ")
for event in events:
    year = str(event["season_idyear"])[-2:]
    number = event["number"]
    logging.critical(
        f"[{year}{number:02}] "
        f"{event['season_idyear']} "
        f"OY{event['number']}: {event['name']}",
    )

selected_event = None
while True:
    logging.critical("event code?")
    event_code = stdin.readline().strip()
    for event in events:
        year = str(event["season_idyear"])[-2:]
        number = event["number"]
        if str(year == event_code[:2]):
            if event_code[-2:] == f"{number:02}":
                selected_event = event
                break
    else:
        logging.critical("that is not a valid event code.")
        continue
    break

cursor_dict.execute("SELECT * FROM oypoints.member")
members = []
competitors = []
non_members = []

for member in cursor_dict.fetchall():
    members.append(
        _Member(
            first_name=member["first_name"],
            last_name=member["last_name"],
            dob=member["DOB"],
            gender=member["gender"],
            memberid=member["idmember"],
        ),
    )

csv_timeformat = '%H:%M:%S'

with open(csv_path, "r") as csvfile:
    reader = DictReader(csvfile)
    for competitor_raw in reader:
        competitors.append(
            _Competitor(
                first_name=competitor_raw["First name"],
                last_name=competitor_raw["Surname"],
                dob=date(
                    int(competitor_raw["YB"]),
                    1,
                    1,
                ) if competitor_raw["YB"] else None,
                gender=competitor_raw["S"],
                grade=competitor_raw["Short"],
                time=(
                    datetime.strptime(
                        competitor_raw["Finish"], csv_timeformat,
                    ) - datetime.strptime(
                        competitor_raw["Start"], csv_timeformat,
                    )
                ) if competitor_raw["Time"] else None,
            ),
        )


for competitor in competitors:
    matches_temp = process.extract(
        competitor.full_name(),
        [member.full_name() for member in members],
        limit=3,
        scorer=fuzz.token_sort_ratio,
    )
    matches = []
    for match in matches_temp:
        matches.append(_Match(name=match[0], score=match[1]))
    top_match = matches[0]

    if len(list(filter(lambda match: match.is_certain(), matches))) > 1:
        logging.warning(
            f"OMIT:multiple members with name {competitor} found",
        )

    elif top_match.is_certain():
        _certain_match()
    elif top_match.is_possible():
        _find_possible_match()
    else:
        non_members.append(competitor)
        logging.info(
            f"OMIT: no membership found for competitor {competitor}",
        )

logging.info("competitors matched in this import:")
logging.info(", ".join(
    [non_member.full_name() for non_member in non_members],
))

commit_and_close()
