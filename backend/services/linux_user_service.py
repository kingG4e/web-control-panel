import os
import subprocess
import secrets
import string
from typing import Optional, Tuple
import platform

# Unix/Linux specific imports
try:
    import pwd
    import grp
    UNIX_MODULES_AVAILABLE = True
except ImportError:
    UNIX_MODULES_AVAILABLE = False
    print("Warning: Unix modules (pwd, grp) not available. Running in Windows mode.")

class LinuxUserService:
    def __init__(self):
        self.web_group = 'www-data'
        self.shell = '/bin/bash'
        self.is_development = not UNIX_MODULES_AVAILABLE
        
    def generate_secure_password(self, length: int = 16) -> str:
        """สร้างรหัสผ่านแบบสุ่มที่ปลอดภัย"""
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        password = ''.join(secrets.choice(alphabet) for _ in range(length))
        return password
    
    def create_user(self, username: str, domain: str, password: Optional[str] = None) -> Tuple[bool, str, Optional[str]]:
        """
        สร้าง Linux user ใหม่
        Args:
            username: ชื่อ user
            domain: ชื่อ domain
            password: รหัสผ่าน (ถ้าไม่ระบุจะสร้างอัตโนมัติ)
        Returns: (success, message, password)
        """
        # ตรวจสอบว่าอยู่บน Unix/Linux system หรือไม่
        if not UNIX_MODULES_AVAILABLE:
            # Development mode - simulate user creation
            print(f"Development Mode: Simulating user creation for {username}")
            return True, f"Development mode: User {username} created successfully (simulated)", password
        
        try:
            # ตรวจสอบว่า username ซ้ำหรือไม่
            try:
                pwd.getpwnam(username)
                return False, f"User {username} already exists", None
            except KeyError:
                pass  # User ไม่มีอยู่ ดำเนินการต่อได้
            
            # ใช้รหัสผ่านที่ส่งมา (ตอนนี้ password จะต้องมีค่าแน่นอน)
            if not password:
                return False, "Password is required", None
            
            # สร้าง user
            cmd = [
                'useradd',
                '-m',  # สร้าง home directory
                '-s', self.shell,  # ตั้ง shell
                '-G', self.web_group,  # เพิ่มเข้า www-data group
                '-c', f'Virtual Host User for {domain}',  # comment
                username
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            
            # ตั้งรหัสผ่าน
            passwd_cmd = ['passwd', username]
            passwd_process = subprocess.Popen(
                passwd_cmd, 
                stdin=subprocess.PIPE, 
                stdout=subprocess.PIPE, 
                stderr=subprocess.PIPE, 
                text=True
            )
            
            stdout, stderr = passwd_process.communicate(input=f"{password}\n{password}\n")
            
            if passwd_process.returncode != 0:
                # ลบ user ที่สร้างไปแล้วถ้าตั้งรหัสผ่านไม่สำเร็จ
                subprocess.run(['userdel', '-r', username], capture_output=True)
                return False, f"Failed to set password: {stderr}", None
            
            # สร้าง public_html directory
            home_dir = f'/home/{username}'
            public_html_dir = f'{home_dir}/public_html'
            
            os.makedirs(public_html_dir, exist_ok=True)
            
            # ตั้งสิทธิ์
            self._set_permissions(username, home_dir, public_html_dir)
            
            # สร้างไฟล์ index.html เริ่มต้น
            self._create_default_files(public_html_dir, domain, username)
            
            return True, f"User {username} created successfully", password
            
        except subprocess.CalledProcessError as e:
            return False, f"Failed to create user: {e.stderr if e.stderr else str(e)}", None
        except Exception as e:
            return False, f"Error creating user: {str(e)}", None
    
    def delete_user(self, username: str) -> Tuple[bool, str]:
        """
        ลบ Linux user
        Returns: (success, message)
        """
        # ตรวจสอบว่าอยู่บน Unix/Linux system หรือไม่
        if not UNIX_MODULES_AVAILABLE:
            print(f"Development Mode: Simulating user deletion for {username}")
            return True, f"Development mode: User {username} deleted successfully (simulated)"
        
        try:
            # ตรวจสอบว่า user มีอยู่หรือไม่
            try:
                pwd.getpwnam(username)
            except KeyError:
                return True, f"User {username} does not exist"
            
            # ลบ user และ home directory
            cmd = ['userdel', '-r', username]
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            
            return True, f"User {username} deleted successfully"
            
        except subprocess.CalledProcessError as e:
            return False, f"Failed to delete user: {e.stderr if e.stderr else str(e)}"
        except Exception as e:
            return False, f"Error deleting user: {str(e)}"
    
    def user_exists(self, username: str) -> bool:
        """ตรวจสอบว่า user มีอยู่หรือไม่"""
        if not UNIX_MODULES_AVAILABLE:
            return False  # ใน Windows ให้ถือว่า user ไม่มี
        
        try:
            pwd.getpwnam(username)
            return True
        except KeyError:
            return False
    
    def get_user_home(self, username: str) -> Optional[str]:
        """ดึง home directory ของ user"""
        if not UNIX_MODULES_AVAILABLE:
            return None
        
        try:
            user_info = pwd.getpwnam(username)
            return user_info.pw_dir
        except KeyError:
            return None
    
    def _set_permissions(self, username: str, home_dir: str, public_html_dir: str):
        """ตั้งสิทธิ์ไฟล์และโฟลเดอร์"""
        if not UNIX_MODULES_AVAILABLE:
            print("Warning: Cannot set permissions on Windows system")
            return
        
        try:
            # ดึง UID และ GID
            user_info = pwd.getpwnam(username)
            www_data_info = grp.getgrnam(self.web_group)
            
            uid = user_info.pw_uid
            gid = user_info.pw_gid
            www_gid = www_data_info.gr_gid
            
            # ตั้งเจ้าของ home directory
            os.chown(home_dir, uid, gid)
            os.chmod(home_dir, 0o755)
            
            # ตั้งเจ้าของ public_html
            os.chown(public_html_dir, uid, www_gid)
            os.chmod(public_html_dir, 0o755)
            
        except Exception as e:
            print(f"Warning: Could not set permissions: {e}")
    
    def _create_default_files(self, public_html_dir: str, domain: str, username: str):
        """สร้างไฟล์เริ่มต้น"""
        try:
            # สร้าง index.html
            index_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to {domain}</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }}
        .container {{
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 600px;
            width: 90%;
        }}
        h1 {{
            color: #4CAF50;
            margin-bottom: 20px;
            font-size: 2.5em;
        }}
        .info {{
            background: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #4CAF50;
        }}
        .info-item {{
            margin: 10px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        .label {{
            font-weight: bold;
            color: #666;
        }}
        .value {{
            color: #333;
            font-family: monospace;
            background: #e9ecef;
            padding: 2px 8px;
            border-radius: 3px;
        }}
        .success-icon {{
            font-size: 4em;
            color: #4CAF50;
            margin-bottom: 20px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="success-icon">🎉</div>
        <h1>Welcome to {domain}</h1>
        <p>Your virtual host is working perfectly!</p>
        
        <div class="info">
            <h3>Site Information</h3>
            <div class="info-item">
                <span class="label">Domain:</span>
                <span class="value">{domain}</span>
            </div>
            <div class="info-item">
                <span class="label">Linux User:</span>
                <span class="value">{username}</span>
            </div>
            <div class="info-item">
                <span class="label">Document Root:</span>
                <span class="value">/home/{username}/public_html</span>
            </div>
            <div class="info-item">
                <span class="label">PHP Version:</span>
                <span class="value"><?php echo phpversion(); ?></span>
            </div>
            <div class="info-item">
                <span class="label">Current Time:</span>
                <span class="value"><?php echo date('Y-m-d H:i:s'); ?></span>
            </div>
        </div>
        
        <p><strong>You can now upload your website files to this directory!</strong></p>
    </div>
</body>
</html>"""
            
            with open(os.path.join(public_html_dir, 'index.php'), 'w', encoding='utf-8') as f:
                f.write(index_content)
            
            # สร้าง .htaccess สำหรับ security
            htaccess_content = """# Security
Options -Indexes
ServerSignature Off

# PHP Security
php_flag display_errors Off
php_flag log_errors On

# File Protection
<Files .htaccess>
    order allow,deny
    deny from all
</Files>

# Redirect to HTTPS (if available)
# RewriteEngine On
# RewriteCond %{HTTPS} off
# RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
"""
            
            with open(os.path.join(public_html_dir, '.htaccess'), 'w', encoding='utf-8') as f:
                f.write(htaccess_content)
            
            # ตั้งสิทธิ์ไฟล์
            if UNIX_MODULES_AVAILABLE:
                user_info = pwd.getpwnam(username)
                www_data_info = grp.getgrnam(self.web_group)
                
                for filename in ['index.php', '.htaccess']:
                    filepath = os.path.join(public_html_dir, filename)
                    os.chown(filepath, user_info.pw_uid, www_data_info.gr_gid)
                    os.chmod(filepath, 0o644)
            else:
                print("Warning: Cannot set file permissions on Windows system")
                
        except Exception as e:
            print(f"Warning: Could not create default files: {e}")

    def generate_username_from_domain(self, domain: str) -> str:
        """สร้าง username จาก domain name
        Examples:
        - test.com → test
        - example.org → example  
        - my-site.net → mysite
        - sub.domain.com → sub
        """
        # เอาเฉพาะส่วนแรกก่อน . แรก (subdomain หรือ main domain)
        username = domain.split('.')[0]
        
        # ลบอักขระพิเศษ เหลือแต่ตัวอักษรและตัวเลข
        username = ''.join(c for c in username if c.isalnum())
        username = username.lower()
        
        # ถ้าว่างเปล่า ให้ใช้ 'site' เป็นค่าเริ่มต้น
        if not username:
            username = 'site'
        
        # จำกัดความยาวไม่เกิน 20 ตัวอักษร
        if len(username) > 20:
            username = username[:20]
        
        # ถ้า username ซ้ำ ให้เพิ่มเลขท้าย
        original_username = username
        counter = 1
        while self.user_exists(username):
            # คำนวณจำนวนหลักของ counter
            counter_str = str(counter)
            max_base_length = 20 - len(counter_str)
            
            if len(original_username) > max_base_length:
                base = original_username[:max_base_length]
            else:
                base = original_username
                
            username = f"{base}{counter}"
            counter += 1
            
            # ป้องกันไม่ให้วนไม่รู้จบ
            if counter > 999:
                username = f"user{counter}"
                break
            
        return username 