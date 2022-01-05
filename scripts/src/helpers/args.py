import logging
from os import path

from clinput import prompt
from .connection import session, tables
from argparse import ArgumentParser, FileType
import warnings
from sqlalchemy import exc as sa_exc


def _parse_args():
    parser = ArgumentParser()
    parser.add_argument("filename", nargs="?", type=str)
    parser.add_argument("--year", type=int)
    return parser.parse_args()


def get_season() -> int:
    args = _parse_args()
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", category=sa_exc.SAWarning)
        seasons = [
            season.year for season in session.query(
                tables.Season).all()]
    if args.year:
        if args.year in seasons:
            return args.year
        logging.critical(
            f"Command line argument {args.year} is not a valid season",
        )
    return prompt.List(
        "season",
        seasons,
        default=seasons[-1],  # select most recent year by default
    ).prompt()


def get_filename() -> str:
    args = _parse_args()
    if args.filename:
        return path.join(path.dirname(__file__), "../../../", args.filename)
    raise Exception("No file name given, no data to process!")
