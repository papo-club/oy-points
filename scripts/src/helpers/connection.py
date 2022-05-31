"""Define cursor object so the other scripts can connect to the database."""
import logging
from os import environ
from types import SimpleNamespace
from sqlalchemy.schema import Table
from sqlalchemy.ext.automap import automap_base
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, registry  # type: ignore
import sshtunnel

uri_args = {
    "mysql": {
        "host": "127.0.0.1",
        "port": "3306",
        "user": "root",
        "password": "root",
        "name": "oypoints",
    },
    "ssh": {
        "host": "127.0.01",
        "port": "22",
        "user": "root",
        "password": "root"
    },
}

if environ.get("SCRIPTS_ENV") == "production":
    for tool in uri_args:
        for key in uri_args[tool]:
            uri_value = environ.get(f"{tool.upper()}_{key.upper()}")
            if uri_value:
                uri_args[tool][key] = uri_value


def get_session_and_tables():
    tunnel = None
    if environ.get("SCRIPTS_ENV") == "production":
        tunnel = sshtunnel.SSHTunnelForwarder(
            (uri_args["ssh"]["host"], 22),
            ssh_username=uri_args["ssh"]["user"],
            ssh_password=uri_args["ssh"]["password"],
            remote_bind_address=("127.0.0.1", 3306),
        )
        tunnel.start()
        uri = "mysql://{user}:{password}@{host}:{tunnelport}/{name}".format(
            **uri_args["mysql"],
            tunnelport=tunnel.local_bind_port
        )
    else:
        uri = "mysql://{user}:{password}@{host}/{name}".format(
            **uri_args["mysql"],
        )
    session = Session(engine := create_engine(uri, echo=False, future=True))
    Base = automap_base()
    Base.prepare(engine, reflect=True)
    tables = SimpleNamespace(**{table_name.replace("_",
                                                   " ").title().replace(" ",
                                                                        ""): getattr(Base.classes,
                                                                                     table_name) for table_name in Base.classes.keys()})
    return tunnel, session, tables


def commit_and_close(tunnel, session):
    session.commit()
    session.close()
    if tunnel:
        tunnel.close()
