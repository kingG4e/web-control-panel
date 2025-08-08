import logging
import os
import re
import sys
from datetime import datetime

from flask import Flask

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import utils.logger as logger  # noqa: E402


class DummyUser:
    username = "dummy"


def test_audit_log_contains_action_and_timestamp(caplog):
    logger.datetime = datetime
    app = Flask(__name__)
    action = "test_action"
    user = DummyUser()

    with app.app_context():
        with caplog.at_level(logging.INFO, logger=app.logger.name):
            logger.audit_log(user, action)

    log_text = caplog.text
    assert action in log_text
    assert re.search(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}", log_text)
