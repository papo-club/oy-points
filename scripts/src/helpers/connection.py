"""Define cursor object so the other scripts can connect to the database."""
import logging
from os import environ
from types import SimpleNamespace
from sqlalchemy.schema import Table
from sqlalchemy.ext.automap import automap_base
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, registry  # type: ignore

uri_args = {
    "host": "127.0.0.1",
    "port": "3306",
    "user": "root",
    "password": "root",
    "db": "oypoints",
}
for key in uri_args:
    uri_value = environ.get(f"MYSQL_{key.upper()}")
    if uri_value:
        uri_args[key] = uri_value

session = Session(engine := create_engine(
    "mysql://{user}:{password}@{host}:{port}/{db}".format(
        **uri_args,
    ),
    echo=False,
    future=True,
))

Base = automap_base()
Base.prepare(engine, reflect=True)
tables = SimpleNamespace(**{table_name.replace("_",
                                               " ").title().replace(" ",
                         ""): getattr(Base.classes,
                                      table_name) for table_name in Base.classes.keys()})


def commit_and_close():
    session.commit()
    session.close()
