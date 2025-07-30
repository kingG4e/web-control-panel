import schedule
import time
import threading
from datetime import datetime, timedelta
from typing import Dict, Optional
from services.sync_check_service import SyncCheckService
from services.backup_service import BackupService
import os
import platform

class SchedulerService:
    """Service สำหรับจัดการ scheduled tasks"""
    
    def __init__(self):
        self.sync_check_service = SyncCheckService()
        self.backup_service = BackupService()
        self.is_running = False
        self.scheduler_thread = None
        self.is_windows = platform.system() == 'Windows'
        
        # Configuration
        self.sync_check_interval_hours = int(os.environ.get('SYNC_CHECK_INTERVAL_HOURS', 6))  # ทุก 6 ชั่วโมง
        self.backup_interval_days = int(os.environ.get('BACKUP_INTERVAL_DAYS', 1))  # ทุกวัน
        self.backup_time = os.environ.get('BACKUP_TIME', '02:00')  # 2:00 AM
        
        self._setup_schedules()
    
    def _setup_schedules(self):
        """ตั้งค่า scheduled tasks"""
        # Sync check ทุก X ชั่วโมง
        schedule.every(self.sync_check_interval_hours).hours.do(self._run_sync_check)
        
        # Backup ทุกวันเวลาที่กำหนด
        schedule.every().day.at(self.backup_time).do(self._run_backup)
        
        # Cleanup old backups ทุกสัปดาห์
        schedule.every().sunday.at("03:00").do(self._cleanup_old_backups)
        
        # Health check ทุก 30 นาที
        schedule.every(30).minutes.do(self._run_health_check)
    
    def start(self) -> Dict:
        """เริ่ม scheduler"""
        if self.is_running:
            return {
                'success': False,
                'message': 'Scheduler is already running'
            }
        
        try:
            self.is_running = True
            self.scheduler_thread = threading.Thread(target=self._run_scheduler, daemon=True)
            self.scheduler_thread.start()
            
            return {
                'success': True,
                'message': 'Scheduler started successfully',
                'configuration': {
                    'sync_check_interval_hours': self.sync_check_interval_hours,
                    'backup_interval_days': self.backup_interval_days,
                    'backup_time': self.backup_time
                }
            }
        except Exception as e:
            self.is_running = False
            return {
                'success': False,
                'error': str(e)
            }
    
    def stop(self) -> Dict:
        """หยุด scheduler"""
        if not self.is_running:
            return {
                'success': False,
                'message': 'Scheduler is not running'
            }
        
        try:
            self.is_running = False
            schedule.clear()
            
            return {
                'success': True,
                'message': 'Scheduler stopped successfully'
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_status(self) -> Dict:
        """ดูสถานะ scheduler"""
        jobs = []
        for job in schedule.jobs:
            jobs.append({
                'job': str(job.job_func),
                'next_run': job.next_run.isoformat() if job.next_run else None,
                'interval': str(job.interval),
                'unit': job.unit
            })
        
        return {
            'is_running': self.is_running,
            'thread_alive': self.scheduler_thread.is_alive() if self.scheduler_thread else False,
            'total_jobs': len(schedule.jobs),
            'jobs': jobs,
            'configuration': {
                'sync_check_interval_hours': self.sync_check_interval_hours,
                'backup_interval_days': self.backup_interval_days,
                'backup_time': self.backup_time
            }
        }
    
    def force_run_task(self, task_name: str) -> Dict:
        """รัน task ทันที (สำหรับ testing หรือ manual trigger)"""
        try:
            if task_name == 'sync_check':
                return self._run_sync_check()
            elif task_name == 'backup':
                return self._run_backup()
            elif task_name == 'cleanup':
                return self._cleanup_old_backups()
            elif task_name == 'health_check':
                return self._run_health_check()
            else:
                return {
                    'success': False,
                    'error': f'Unknown task: {task_name}'
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _run_scheduler(self):
        """Main scheduler loop"""
        print(f"Scheduler started at {datetime.now()}")
        
        while self.is_running:
            try:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
            except Exception as e:
                print(f"Scheduler error: {e}")
        
        print(f"Scheduler stopped at {datetime.now()}")
    
    def _run_sync_check(self) -> Dict:
        """รัน sync check"""
        try:
            print(f"Running scheduled sync check at {datetime.now()}")
            
            results = self.sync_check_service.run_full_sync_check()
            

            
            return {
                'success': True,
                'task': 'sync_check',
                'timestamp': datetime.now().isoformat(),
                'results': results
            }
            
        except Exception as e:
            print(f"Scheduled sync check failed: {e}")
            return {
                'success': False,
                'task': 'sync_check',
                'error': str(e)
            }
    
    def _run_backup(self) -> Dict:
        """รัน backup"""
        try:
            print(f"Running scheduled backup at {datetime.now()}")
            
            results = self.backup_service.create_full_backup()
            

                    extra_data={
                        'backup_id': results['backup_id'],
                        'errors': results['errors'],
                        'scheduled': True
                    }
                )
            
            return {
                'success': True,
                'task': 'backup',
                'timestamp': datetime.now().isoformat(),
                'results': results
            }
            
        except Exception as e:
            print(f"Scheduled backup failed: {e}")
            return {
                'success': False,
                'task': 'backup',
                'error': str(e)
            }
    
    def _cleanup_old_backups(self) -> Dict:
        """ลบ backups เก่า"""
        try:
            print(f"Running scheduled backup cleanup at {datetime.now()}")
            
            results = self.backup_service.cleanup_old_backups()
            

            
            return {
                'success': True,
                'task': 'cleanup',
                'timestamp': datetime.now().isoformat(),
                'results': results
            }
            
        except Exception as e:
            print(f"Scheduled backup cleanup failed: {e}")
            return {
                'success': False,
                'task': 'cleanup',
                'error': str(e)
            }
    
    def _run_health_check(self) -> Dict:
        """รัน health check"""
        try:
            # ตรวจสอบเฉพาะ critical services
            critical_services = ['nginx', 'mysql']
            
            if not self.is_windows:
                import subprocess
                failed_services = []
                
                for service in critical_services:
                    try:
                        result = subprocess.run(
                            ['systemctl', 'is-active', service], 
                            capture_output=True, text=True, timeout=5
                        )
                        if result.stdout.strip() != 'active':
                            failed_services.append(service)
                    except Exception:
                        failed_services.append(service)
                

                    
                    return {
                        'success': False,
                        'task': 'health_check',
                        'failed_services': failed_services,
                        'timestamp': datetime.now().isoformat()
                    }
            
            return {
                'success': True,
                'task': 'health_check',
                'timestamp': datetime.now().isoformat(),
                'message': 'All critical services are running'
            }
            
        except Exception as e:
            print(f"Scheduled health check failed: {e}")
            return {
                'success': False,
                'task': 'health_check',
                'error': str(e)
            }

# Global scheduler instance
scheduler_service = SchedulerService() 