import re

def is_safe_database_name(name):
    """
    Validates a database name to prevent SQL injection.
    - Allows alphanumeric characters and underscores.
    - Must start with a letter.
    - Length between 3 and 64 characters.
    """
    if not re.match(r'^[a-zA-Z][a-zA-Z0-9_]{2,63}$', name):
        return False
    return True
