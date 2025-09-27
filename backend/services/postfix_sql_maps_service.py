import os
from dataclasses import dataclass


@dataclass
class PostfixSQLMapPaths:
    domains_map: str = "/etc/postfix/mysql-virtual-mailbox-domains.cf"
    mailbox_map: str = "/etc/postfix/mysql-virtual-mailbox-maps.cf"
    alias_map: str = "/etc/postfix/mysql-virtual-alias-maps.cf"


@dataclass
class MySQLConnectionConfig:
    host: str
    user: str
    password: str
    database: str


class PostfixSQLMapsService:
    """Generate Postfix MySQL lookup map files from env/config.

    This service only writes map files with SQL queries. Postfix will use these
    files for runtime lookups; no app-level DB connection is performed here.
    """

    def __init__(self, paths: PostfixSQLMapPaths | None = None):
        self.paths = paths or PostfixSQLMapPaths()

    def _render_map(self, conn: MySQLConnectionConfig, query: str) -> str:
        return (
            f"hosts = {conn.host}\n"
            f"user = {conn.user}\n"
            f"password = {conn.password}\n"
            f"dbname = {conn.database}\n"
            f"query = {query}\n"
        )

    def write_domain_map(self, conn: MySQLConnectionConfig, table: str = "email_domain") -> str:
        """Write domains map: returns path written.

        Expected schema: table has column `domain` and `status` with 'active'.
        """
        query = (
            "SELECT 1 FROM "
            f"{table} WHERE domain = '%s' AND status = 'active'"
        )
        content = self._render_map(conn, query)
        self._write_file(self.paths.domains_map, content)
        return self.paths.domains_map

    def write_mailbox_map(self, conn: MySQLConnectionConfig, users_table: str = "email_account", domains_table: str = "email_domain") -> str:
        """Write mailbox map: returns path written.

        Supports two schemas:
        - Legacy schema: `email_account` joined with `email_domain`
        - Minimal schema: `email_user(email, maildir, status)` returning maildir directly
        """
        if users_table in ('email_user', 'email_users'):
            # Minimal schema: maildir stored directly, email is full address
            query = (
                "SELECT maildir FROM " f"{users_table} "
                "WHERE email = '%s' AND status = 'active'"
            )
        else:
            # Legacy schema
            query = (
                "SELECT CONCAT(d.domain,'/', a.username, '/') "
                "FROM " f"{users_table} a JOIN {domains_table} d ON d.id = a.domain_id "
                "WHERE CONCAT(a.username,'@',d.domain) = '%s' "
                "AND a.status = 'active' AND d.status = 'active'"
            )
        content = self._render_map(conn, query)
        self._write_file(self.paths.mailbox_map, content)
        return self.paths.mailbox_map

    def write_alias_map(self, conn: MySQLConnectionConfig, fwd_table: str = "email_forwarder", domains_table: str = "email_domain") -> str:
        """Write alias/forwarder map: returns path written.

        Supports two schemas:
        - Legacy schema: `email_forwarder` joined with `email_domain`
        - Minimal schema: `email_alias(source, destination, status)` with full emails
        """
        if fwd_table == 'email_alias':
            query = (
                "SELECT destination FROM " f"{fwd_table} "
                "WHERE source = '%s' AND status = 'active'"
            )
        else:
            query = (
                "SELECT f.destination "
                "FROM " f"{fwd_table} f JOIN {domains_table} d ON d.id = f.domain_id "
                "WHERE CONCAT(f.source,'@',d.domain) = '%s' AND f.status = 'active'"
            )
        content = self._render_map(conn, query)
        self._write_file(self.paths.alias_map, content)
        return self.paths.alias_map

    def _write_file(self, path: str, content: str) -> None:
        directory = os.path.dirname(path)
        if directory:
            os.makedirs(directory, exist_ok=True)
        # Restrictive perms: readable by root/postfix only
        with open(path, 'w') as f:
            f.write(content)
        try:
            os.chmod(path, 0o640)
        except PermissionError:
            # On dev environments, permission change may fail; ignore
            pass


