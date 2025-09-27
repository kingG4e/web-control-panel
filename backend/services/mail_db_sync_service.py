import os
import mysql.connector
from mysql.connector import Error
from datetime import datetime


class MailDBSyncService:
    """Syncs domains/accounts/forwarders into the server's mail database.

    Uses envs (overrideable):
      MYSQL_POSTFIX_HOST, MYSQL_POSTFIX_USER, MYSQL_POSTFIX_PASSWORD, MYSQL_POSTFIX_DB

    Schema (created if missing, minimal for Postfix lookups used by maps):
      email_domain(id, domain UNIQUE, status, created_at, updated_at)
      email_account(id, domain_id, username, password, quota, status, created_at, updated_at,
                    UNIQUE(domain_id, username))
      email_forwarder(id, domain_id, source, destination, status, created_at, updated_at,
                      UNIQUE(domain_id, source))
    """

    def __init__(self) -> None:
        self.config = {
            'host': os.environ.get('MYSQL_POSTFIX_HOST', '127.0.0.1'),
            'user': os.environ.get('MYSQL_POSTFIX_USER', 'mailadmin'),
            'password': os.environ.get('MYSQL_POSTFIX_PASSWORD', 'King_73260'),
            'database': os.environ.get('MYSQL_POSTFIX_DB', 'mail'),
        }

    def _conn(self):
        return mysql.connector.connect(**self.config)

    def ensure_schema(self) -> None:
        try:
            with self._conn() as conn:
                cur = conn.cursor()
                cur.execute(
                    """
CREATE TABLE IF NOT EXISTS email_domain (
  id INT AUTO_INCREMENT PRIMARY KEY,
  domain VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(50) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
                    """
                )
                cur.execute(
                    """
CREATE TABLE IF NOT EXISTS email_account (
  id INT AUTO_INCREMENT PRIMARY KEY,
  domain_id INT NOT NULL,
  username VARCHAR(64) NOT NULL,
  password VARCHAR(255) DEFAULT NULL,
  quota INT DEFAULT 1024,
  status VARCHAR(50) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_email_account (domain_id, username),
  CONSTRAINT fk_email_account_domain FOREIGN KEY (domain_id) REFERENCES email_domain(id) ON DELETE CASCADE
)
                    """
                )
                cur.execute(
                    """
CREATE TABLE IF NOT EXISTS email_forwarder (
  id INT AUTO_INCREMENT PRIMARY KEY,
  domain_id INT NOT NULL,
  source VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_email_forwarder (domain_id, source),
  CONSTRAINT fk_email_forwarder_domain FOREIGN KEY (domain_id) REFERENCES email_domain(id) ON DELETE CASCADE
)
                    """
                )
                conn.commit()
        except Error:
            # Non-fatal; caller may choose to ignore sync failures
            pass

    def upsert_domain(self, domain: str, status: str = 'active') -> int | None:
        try:
            with self._conn() as conn:
                cur = conn.cursor()
                cur.execute("SELECT id FROM email_domain WHERE domain=%s", (domain,))
                row = cur.fetchone()
                if row:
                    cur.execute("UPDATE email_domain SET status=%s WHERE id=%s", (status, row[0]))
                    conn.commit()
                    return int(row[0])
                cur.execute("INSERT INTO email_domain (domain, status, created_at) VALUES (%s,%s,%s)", (domain, status, datetime.utcnow()))
                conn.commit()
                return int(cur.lastrowid)
        except Error:
            return None

    def remove_domain_if_empty(self, domain: str) -> None:
        try:
            with self._conn() as conn:
                cur = conn.cursor()
                cur.execute("SELECT id FROM email_domain WHERE domain=%s", (domain,))
                row = cur.fetchone()
                if not row:
                    return
                domain_id = int(row[0])
                cur.execute("SELECT COUNT(*) FROM email_account WHERE domain_id=%s", (domain_id,))
                acc_count = cur.fetchone()[0]
                cur.execute("SELECT COUNT(*) FROM email_forwarder WHERE domain_id=%s", (domain_id,))
                fwd_count = cur.fetchone()[0]
                if acc_count == 0 and fwd_count == 0:
                    cur.execute("DELETE FROM email_domain WHERE id=%s", (domain_id,))
                    conn.commit()
        except Error:
            return

    def upsert_account(self, domain: str, username: str, password: str | None, quota: int = 1024, status: str = 'active') -> None:
        try:
            with self._conn() as conn:
                cur = conn.cursor()
                cur.execute("SELECT id FROM email_domain WHERE domain=%s", (domain,))
                row = cur.fetchone()
                if not row:
                    cur.execute("INSERT INTO email_domain (domain, status, created_at) VALUES (%s,%s,%s)", (domain, 'active', datetime.utcnow()))
                    domain_id = int(cur.lastrowid)
                else:
                    domain_id = int(row[0])
                cur.execute("SELECT id FROM email_account WHERE domain_id=%s AND username=%s", (domain_id, username))
                row = cur.fetchone()
                if row:
                    cur.execute(
                        "UPDATE email_account SET password=%s, quota=%s, status=%s WHERE id=%s",
                        (password, quota, status, int(row[0]))
                    )
                else:
                    cur.execute(
                        "INSERT INTO email_account (domain_id, username, password, quota, status, created_at) VALUES (%s,%s,%s,%s,%s,%s)",
                        (domain_id, username, password, quota, status, datetime.utcnow())
                    )
                conn.commit()
        except Error:
            return

    def delete_account(self, domain: str, username: str) -> None:
        try:
            with self._conn() as conn:
                cur = conn.cursor()
                cur.execute("SELECT id FROM email_domain WHERE domain=%s", (domain,))
                row = cur.fetchone()
                if not row:
                    return
                domain_id = int(row[0])
                cur.execute("DELETE FROM email_account WHERE domain_id=%s AND username=%s", (domain_id, username))
                conn.commit()
        except Error:
            return

    def upsert_forwarder(self, domain: str, source: str, destination: str, status: str = 'active') -> None:
        try:
            with self._conn() as conn:
                cur = conn.cursor()
                cur.execute("SELECT id FROM email_domain WHERE domain=%s", (domain,))
                row = cur.fetchone()
                if not row:
                    cur.execute("INSERT INTO email_domain (domain, status, created_at) VALUES (%s,%s,%s)", (domain, 'active', datetime.utcnow()))
                    domain_id = int(cur.lastrowid)
                else:
                    domain_id = int(row[0])
                cur.execute("SELECT id FROM email_forwarder WHERE domain_id=%s AND source=%s", (domain_id, source))
                row = cur.fetchone()
                if row:
                    cur.execute("UPDATE email_forwarder SET destination=%s, status=%s WHERE id=%s", (destination, status, int(row[0])))
                else:
                    cur.execute(
                        "INSERT INTO email_forwarder (domain_id, source, destination, status, created_at) VALUES (%s,%s,%s,%s,%s)",
                        (domain_id, source, destination, status, datetime.utcnow())
                    )
                conn.commit()
        except Error:
            return

    def delete_forwarder(self, domain: str, source: str) -> None:
        try:
            with self._conn() as conn:
                cur = conn.cursor()
                cur.execute("SELECT id FROM email_domain WHERE domain=%s", (domain,))
                row = cur.fetchone()
                if not row:
                    return
                domain_id = int(row[0])
                cur.execute("DELETE FROM email_forwarder WHERE domain_id=%s AND source=%s", (domain_id, source))
                conn.commit()
        except Error:
            return


