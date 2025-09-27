import os
from typing import List, Dict, Optional, Tuple

import mysql.connector
from mysql.connector import Error


class MailDbReader:
    """Read accounts directly from the mail MySQL database.

    Supports schemas:
    - Minimal: email_user or email_users with columns (email, maildir, status [, quota])
    - If both tables exist, prefer `email_user`.
    """

    def __init__(self):
        # Defaults (can be overridden by Postfix map files or env)
        self.host = os.environ.get('MYSQL_HOST', '127.0.0.1')
        self.port = int(os.environ.get('MYSQL_PORT', '3306'))
        self.user = os.environ.get('MYSQL_POSTFIX_USER', os.environ.get('MYSQL_USER', 'mailadmin'))
        self.password = os.environ.get('MYSQL_POSTFIX_PASSWORD', os.environ.get('MYSQL_PASSWORD', 'King_73260'))
        self.database = os.environ.get('MYSQL_POSTFIX_DB', os.environ.get('MYSQL_DATABASE', 'mail'))
        self._users_table: Optional[str] = None
        # Track explicit env overrides so map files won't override them
        self._env_overrides = {
            'host': 'MYSQL_HOST' in os.environ,
            'port': 'MYSQL_PORT' in os.environ,
            'user': ('MYSQL_POSTFIX_USER' in os.environ) or ('MYSQL_USER' in os.environ),
            'password': ('MYSQL_POSTFIX_PASSWORD' in os.environ) or ('MYSQL_PASSWORD' in os.environ),
            'database': ('MYSQL_POSTFIX_DB' in os.environ) or ('MYSQL_DATABASE' in os.environ),
        }
        # Try to load connection details from Postfix map files if available
        self._try_load_from_postfix_maps()

    def _connect(self):
        return mysql.connector.connect(
            host=self.host,
            port=self.port,
            user=self.user,
            password=self.password,
            database=self.database,
        )

    def _try_load_from_postfix_maps(self) -> None:
        """Attempt to parse Postfix MySQL map files for connection info and users table.

        Looks at /etc/postfix/mysql-virtual-mailbox-maps.cf primarily.
        """
        mailbox_map_path = "/etc/postfix/mysql-virtual-mailbox-maps.cf"
        if not os.path.exists(mailbox_map_path):
            return
        try:
            with open(mailbox_map_path, 'r') as f:
                lines = f.read().splitlines()
            kv: Dict[str, str] = {}
            for line in lines:
                if '=' in line:
                    key, val = line.split('=', 1)
                    kv[key.strip().lower()] = val.strip()
            hosts_val = kv.get('hosts') or kv.get('host')
            if hosts_val:
                host, port = self._parse_host_port(hosts_val)
                if host and not self._env_overrides['host']:
                    self.host = host
                if port and not self._env_overrides['port']:
                    self.port = port
            if kv.get('user') and not self._env_overrides['user']:
                self.user = kv['user']
            if kv.get('password') and not self._env_overrides['password']:
                self.password = kv['password']
            if kv.get('dbname') and not self._env_overrides['database']:
                self.database = kv['dbname']
            # Infer users table from query if present
            query = kv.get('query', '')
            inferred = self._infer_users_table_from_query(query)
            if inferred:
                self._users_table = inferred
        except Exception:
            # Silent failure; fall back to env defaults
            pass

    def _parse_host_port(self, hosts_field: str) -> Tuple[Optional[str], Optional[int]]:
        hosts_field = hosts_field.strip()
        if not hosts_field:
            return None, None
        # Pick the first host if multiple are provided
        first = hosts_field.split(',')[0].strip()
        if ':' in first:
            host_part, port_part = first.split(':', 1)
            try:
                return host_part, int(port_part)
            except ValueError:
                return host_part, None
        return first, None

    def _infer_users_table_from_query(self, query: str) -> Optional[str]:
        q = query.lower()
        # Very basic detection
        if ' from email_user ' in q or q.endswith(' from email_user') or ' from email_user\n' in q:
            return 'email_user'
        if ' from email_users ' in q or q.endswith(' from email_users') or ' from email_users\n' in q:
            return 'email_users'
        return None

    def _detect_users_table(self, conn) -> str:
        if self._users_table:
            return self._users_table
        cursor = conn.cursor()
        try:
            # Prefer email_user; fallback to email_users
            cursor.execute(
                """
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = %s AND table_name IN ('email_user', 'email_users')
                """,
                (self.database,),
            )
            rows = [r[0] for r in cursor.fetchall()]
            if 'email_user' in rows:
                self._users_table = 'email_user'
            elif 'email_users' in rows:
                self._users_table = 'email_users'
            else:
                # Default guess
                self._users_table = 'email_user'
            return self._users_table
        finally:
            cursor.close()

    def fetch_users_by_domain(self, domain: str) -> List[Dict]:
        """Return list of users dicts for a given domain.

        Dict fields: { 'email': str, 'status': str, 'quota': Optional[int] }
        """
        conn = None
        cursor = None
        try:
            conn = self._connect()
            table = self._detect_users_table(conn)

            # Figure out available columns
            cursor = conn.cursor()
            cursor.execute(
                "SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = %s AND table_name = %s",
                (self.database, table),
            )
            cols = {r[0].lower() for r in cursor.fetchall()}
            has_quota = 'quota' in cols

            # Query active users of domain
            # We use LIKE '%@domain' to match exact domain
            select_cols = "email, status" + (", quota" if has_quota else "")
            query = f"SELECT {select_cols} FROM {table} WHERE email LIKE %s"

            cursor.execute(query, (f"%@{domain}",))
            users: List[Dict] = []
            for row in cursor.fetchall():
                if has_quota:
                    email, status, quota = row
                else:
                    email, status = row
                    quota = None
                users.append({
                    'email': email,
                    'status': status,
                    'quota': quota,
                })
            return users
        except Error as e:
            raise Exception(f"MailDbReader error: {e}")
        finally:
            if cursor:
                try:
                    cursor.close()
                except Exception:
                    pass
            if conn:
                try:
                    conn.close()
                except Exception:
                    pass

    # --- Write helpers ---
    def _get_table_and_columns(self, conn) -> tuple[str, set[str]]:
        table = self._detect_users_table(conn)
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = %s AND table_name = %s",
                (self.database, table),
            )
            cols = {r[0].lower() for r in cursor.fetchall()}
            return table, cols
        finally:
            cursor.close()

    def upsert_user(self, email: str, maildir: str, status: str = 'active', quota: Optional[int] = None, password_hash: Optional[str] = None) -> None:
        conn = None
        cursor = None
        try:
            conn = self._connect()
            table, cols = self._get_table_and_columns(conn)
            has_quota = 'quota' in cols
            has_password = 'password' in cols
            cursor = conn.cursor()
            if has_quota and quota is not None:
                try:
                    if has_password and password_hash is not None:
                        cursor.execute(
                            f"INSERT INTO {table} (email, maildir, status, quota, password) VALUES (%s, %s, %s, %s, %s) "
                            f"ON DUPLICATE KEY UPDATE maildir=VALUES(maildir), status=VALUES(status), quota=VALUES(quota), password=VALUES(password)",
                            (email, maildir, status, int(quota), password_hash),
                        )
                    else:
                        cursor.execute(
                            f"INSERT INTO {table} (email, maildir, status, quota) VALUES (%s, %s, %s, %s) "
                            f"ON DUPLICATE KEY UPDATE maildir=VALUES(maildir), status=VALUES(status), quota=VALUES(quota)",
                            (email, maildir, status, int(quota)),
                        )
                except Error:
                    # Fallback: delete+insert
                    cursor.execute(f"DELETE FROM {table} WHERE email=%s", (email,))
                    if has_password and password_hash is not None:
                        cursor.execute(
                            f"INSERT INTO {table} (email, maildir, status, quota, password) VALUES (%s, %s, %s, %s, %s)",
                            (email, maildir, status, int(quota), password_hash),
                        )
                    else:
                        cursor.execute(
                            f"INSERT INTO {table} (email, maildir, status, quota) VALUES (%s, %s, %s, %s)",
                            (email, maildir, status, int(quota)),
                        )
            else:
                try:
                    if has_password and password_hash is not None:
                        cursor.execute(
                            f"INSERT INTO {table} (email, maildir, status, password) VALUES (%s, %s, %s, %s) "
                            f"ON DUPLICATE KEY UPDATE maildir=VALUES(maildir), status=VALUES(status), password=VALUES(password)",
                            (email, maildir, status, password_hash),
                        )
                    else:
                        cursor.execute(
                            f"INSERT INTO {table} (email, maildir, status) VALUES (%s, %s, %s) "
                            f"ON DUPLICATE KEY UPDATE maildir=VALUES(maildir), status=VALUES(status)",
                            (email, maildir, status),
                        )
                except Error:
                    cursor.execute(f"DELETE FROM {table} WHERE email=%s", (email,))
                    if has_password and password_hash is not None:
                        cursor.execute(
                            f"INSERT INTO {table} (email, maildir, status, password) VALUES (%s, %s, %s, %s)",
                            (email, maildir, status, password_hash),
                        )
                    else:
                        cursor.execute(
                            f"INSERT INTO {table} (email, maildir, status) VALUES (%s, %s, %s)",
                            (email, maildir, status),
                        )
            conn.commit()
        except Error as e:
            if conn:
                try:
                    conn.rollback()
                except Exception:
                    pass
            raise Exception(f"MailDbWriter upsert error: {e}")
        finally:
            if cursor:
                try:
                    cursor.close()
                except Exception:
                    pass
            if conn:
                try:
                    conn.close()
                except Exception:
                    pass

    def update_quota(self, email: str, quota: int) -> None:
        conn = None
        cursor = None
        try:
            conn = self._connect()
            table, cols = self._get_table_and_columns(conn)
            if 'quota' not in cols:
                return
            cursor = conn.cursor()
            cursor.execute(f"UPDATE {table} SET quota=%s WHERE email=%s", (int(quota), email))
            conn.commit()
        except Error as e:
            if conn:
                try:
                    conn.rollback()
                except Exception:
                    pass
            raise Exception(f"MailDbWriter update_quota error: {e}")
        finally:
            if cursor:
                try:
                    cursor.close()
                except Exception:
                    pass
            if conn:
                try:
                    conn.close()
                except Exception:
                    pass

    def delete_user(self, email: str) -> None:
        conn = None
        cursor = None
        try:
            conn = self._connect()
            table = self._detect_users_table(conn)
            cursor = conn.cursor()
            cursor.execute(f"DELETE FROM {table} WHERE email=%s", (email,))
            conn.commit()
        except Error as e:
            if conn:
                try:
                    conn.rollback()
                except Exception:
                    pass
            raise Exception(f"MailDbWriter delete error: {e}")
        finally:
            if cursor:
                try:
                    cursor.close()
                except Exception:
                    pass
            if conn:
                try:
                    conn.close()
                except Exception:
                    pass

    def update_password(self, email: str, password_hash: str) -> None:
        conn = None
        cursor = None
        try:
            conn = self._connect()
            table, cols = self._get_table_and_columns(conn)
            if 'password' not in cols:
                return
            cursor = conn.cursor()
            cursor.execute(f"UPDATE {table} SET password=%s WHERE email=%s", (password_hash, email))
            conn.commit()
        except Error as e:
            if conn:
                try:
                    conn.rollback()
                except Exception:
                    pass
            raise Exception(f"MailDbWriter update_password error: {e}")
        finally:
            if cursor:
                try:
                    cursor.close()
                except Exception:
                    pass
            if conn:
                try:
                    conn.close()
                except Exception:
                    pass


