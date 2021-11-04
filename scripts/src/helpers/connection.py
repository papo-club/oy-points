"""Define cursor object so the other scripts can connect to the database."""
import logging
from os import environ

from mysql import connector  # type: ignore

uri_args = {
    "host": "127.0.0.1",
    "port": "3306",
    "user": "root",
    "password": "root",
}

for key in uri_args:
    uri_value = environ.get(f"MYSQL_{key.upper()}")
    if uri_value:
        uri_args[key] = uri_value

connection = connector.connect(**uri_args)
cursor = connection.cursor()
cursor_dict = connection.cursor(dictionary=True)


def commit_and_close() -> None:
    """Commit the cursor changes and close the connection."""
    logging.info("committing changes...")
    connection.commit()
    connection.close()
    logging.info("done")
