import os
import platform
import shutil
import subprocess


class QuotaService:
    """Best-effort Linux user disk quota manager.

    Uses `setquota` if available to set user quotas on the filesystem that backs /home.
    No-ops on systems without quota tooling or on non-Linux platforms.
    """

    def __init__(self) -> None:
        self.is_linux = platform.system() == 'Linux'

    def _get_home_device(self) -> str | None:
        """Return the device backing /home using `df -P /home` or None on failure."""
        try:
            df_out = subprocess.check_output(['df', '-P', '/home'], text=True).splitlines()
            if len(df_out) < 2:
                return None
            device = df_out[1].split()[0]
            return device
        except Exception:
            return None

    def set_user_quota(self, username: str, quota_mb: int) -> bool:
        """Set both soft and hard quota for a user to the same value (in MB).

        Returns True on best-effort success, False if not applied.
        Never raises on missing tooling; only raises for clearly invalid inputs.
        """
        if not username or quota_mb is None:
            raise ValueError('username and quota_mb are required')

        if not self.is_linux:
            return False

        # Require setquota binary
        if shutil.which('setquota') is None:
            return False

        device = self._get_home_device()
        if not device:
            return False

        try:
            # Convert MB to 1K blocks
            blocks = int(quota_mb) * 1024
            # setquota -u <user> <soft> <hard> <inode-soft> <inode-hard> <device>
            subprocess.run(
                ['setquota', '-u', username, str(blocks), str(blocks), '0', '0', device],
                check=False,
            )
            return True
        except Exception:
            # Swallow errors to keep quota best-effort
            return False


