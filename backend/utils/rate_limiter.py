import time
import json
from functools import wraps
from typing import Dict, Optional
from flask import request, jsonify, g
from datetime import datetime, timedelta
import redis
import os

class RateLimiter:
    """Rate Limiter สำหรับ API endpoints"""
    
    def __init__(self):
        # ใช้ Redis ถ้ามี หรือ in-memory dict สำหรับ development
        self.use_redis = os.environ.get('REDIS_URL') is not None
        
        if self.use_redis:
            try:
                import redis
                self.redis_client = redis.from_url(os.environ.get('REDIS_URL', 'redis://localhost:6379'))
                self.redis_client.ping()  # Test connection
            except Exception:
                self.use_redis = False
                self.memory_store = {}
        else:
            self.memory_store = {}
        
        # Rate limiting rules
        self.limits = {
            'virtual_host_create': {'requests': 5, 'window': 3600},  # 5 requests per hour
            'virtual_host_delete': {'requests': 10, 'window': 3600}, # 10 requests per hour
            'ssl_create': {'requests': 10, 'window': 3600},          # 10 requests per hour
            'email_create': {'requests': 20, 'window': 3600},        # 20 requests per hour
            'database_create': {'requests': 10, 'window': 3600},     # 10 requests per hour
            'general_api': {'requests': 100, 'window': 3600},        # 100 requests per hour
            'sync_check': {'requests': 10, 'window': 600},           # 10 requests per 10 minutes
        }
    
    def _get_client_id(self) -> str:
        """ได้รับ client identifier (IP address หรือ user ID)"""
        if hasattr(g, 'current_user') and g.current_user:
            return f"user_{g.current_user.id}"
        return f"ip_{request.remote_addr}"
    
    def _get_key(self, rule_name: str, client_id: str) -> str:
        """สร้าง key สำหรับ rate limiting"""
        return f"rate_limit:{rule_name}:{client_id}"
    
    def _is_allowed_redis(self, key: str, limit: int, window: int) -> tuple[bool, dict]:
        """ตรวจสอบ rate limit ด้วย Redis"""
        try:
            pipe = self.redis_client.pipeline()
            pipe.multi()
            
            # ใช้ sliding window log algorithm
            now = time.time()
            cutoff = now - window
            
            # ลบ entries เก่า
            pipe.zremrangebyscore(key, 0, cutoff)
            
            # นับจำนวน requests ปัจจุบัน
            pipe.zcard(key)
            
            # เพิ่ม request ปัจจุบัน
            pipe.zadd(key, {str(now): now})
            
            # Set expiry
            pipe.expire(key, window)
            
            results = pipe.execute()
            current_requests = results[1] + 1  # +1 for current request
            
            remaining = max(0, limit - current_requests)
            reset_time = now + window
            
            return current_requests <= limit, {
                'limit': limit,
                'remaining': remaining,
                'reset': int(reset_time),
                'current': current_requests
            }
            
        except Exception as e:
            # Fallback to allowing request if Redis fails
            print(f"Redis rate limiting error: {e}")
            return True, {
                'limit': limit,
                'remaining': limit - 1,
                'reset': int(time.time() + window),
                'current': 1
            }
    
    def _is_allowed_memory(self, key: str, limit: int, window: int) -> tuple[bool, dict]:
        """ตรวจสอบ rate limit ด้วย in-memory storage"""
        now = time.time()
        cutoff = now - window
        
        # ลบ entries เก่า
        if key in self.memory_store:
            self.memory_store[key] = [req_time for req_time in self.memory_store[key] if req_time > cutoff]
        else:
            self.memory_store[key] = []
        
        # เพิ่ม request ปัจจุบัน
        self.memory_store[key].append(now)
        
        current_requests = len(self.memory_store[key])
        remaining = max(0, limit - current_requests)
        reset_time = now + window
        
        return current_requests <= limit, {
            'limit': limit,
            'remaining': remaining,
            'reset': int(reset_time),
            'current': current_requests
        }
    
    def is_allowed(self, rule_name: str, client_id: Optional[str] = None) -> tuple[bool, dict]:
        """ตรวจสอบว่า request นี้ผ่าน rate limit หรือไม่"""
        if rule_name not in self.limits:
            return True, {'limit': 0, 'remaining': 0, 'reset': 0, 'current': 0}
        
        limit_config = self.limits[rule_name]
        limit = limit_config['requests']
        window = limit_config['window']
        
        if client_id is None:
            client_id = self._get_client_id()
        
        key = self._get_key(rule_name, client_id)
        
        if self.use_redis:
            return self._is_allowed_redis(key, limit, window)
        else:
            return self._is_allowed_memory(key, limit, window)
    
    def get_limit_info(self, rule_name: str, client_id: Optional[str] = None) -> dict:
        """ได้รับข้อมูล rate limit สำหรับ rule"""
        if rule_name not in self.limits:
            return {'limit': 0, 'window': 0}
        
        limit_config = self.limits[rule_name]
        allowed, info = self.is_allowed(rule_name, client_id)
        
        return {
            'rule': rule_name,
            'limit': limit_config['requests'],
            'window': limit_config['window'],
            'window_description': f"{limit_config['window']} seconds",
            'current_usage': info
        }

# Global rate limiter instance
rate_limiter = RateLimiter()

def rate_limit(rule_name: str, per_user: bool = True):
    """
    Decorator สำหรับ rate limiting
    
    Args:
        rule_name: ชื่อ rule ใน rate limiter
        per_user: True = rate limit per user, False = rate limit per IP
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            client_id = None
            if per_user and hasattr(g, 'current_user') and g.current_user:
                client_id = f"user_{g.current_user.id}"
            elif not per_user:
                client_id = f"ip_{request.remote_addr}"
            
            allowed, info = rate_limiter.is_allowed(rule_name, client_id)
            
            if not allowed:
                response_data = {
                    'success': False,
                    'error': 'Rate limit exceeded',
                    'error_code': 'RATE_LIMIT_EXCEEDED',
                    'rate_limit': {
                        'limit': info['limit'],
                        'remaining': info['remaining'],
                        'reset': info['reset'],
                        'reset_time': datetime.fromtimestamp(info['reset']).isoformat(),
                        'current': info['current'],
                        'rule': rule_name
                    }
                }
                
                response = jsonify(response_data)
                response.status_code = 429  # Too Many Requests
                
                # เพิ่ม rate limit headers
                response.headers['X-RateLimit-Limit'] = str(info['limit'])
                response.headers['X-RateLimit-Remaining'] = str(info['remaining'])
                response.headers['X-RateLimit-Reset'] = str(info['reset'])
                response.headers['Retry-After'] = str(info['reset'] - int(time.time()))
                
                return response
            
            # เพิ่ม rate limit headers ใน response ปกติ
            response = f(*args, **kwargs)
            if hasattr(response, 'headers'):
                response.headers['X-RateLimit-Limit'] = str(info['limit'])
                response.headers['X-RateLimit-Remaining'] = str(info['remaining'])
                response.headers['X-RateLimit-Reset'] = str(info['reset'])
            
            return response
        return decorated_function
    return decorator

def check_rate_limit_status(rule_name: str, client_id: Optional[str] = None) -> dict:
    """ตรวจสอบสถานะ rate limit สำหรับ rule"""
    return rate_limiter.get_limit_info(rule_name, client_id)

def reset_rate_limit(rule_name: str, client_id: Optional[str] = None) -> bool:
    """รีเซ็ต rate limit สำหรับ client (สำหรับ admin เท่านั้น)"""
    try:
        if client_id is None:
            client_id = rate_limiter._get_client_id()
        
        key = rate_limiter._get_key(rule_name, client_id)
        
        if rate_limiter.use_redis:
            rate_limiter.redis_client.delete(key)
        else:
            if key in rate_limiter.memory_store:
                del rate_limiter.memory_store[key]
        
        return True
    except Exception:
        return False 