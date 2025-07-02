# Clean Code Guidelines

## 🧹 What is Clean Code?

Clean code is code that is easy to understand, maintain, and extend. It follows best practices and principles that make the codebase more readable and maintainable.

## 📋 Principles

### 1. **Single Responsibility Principle (SRP)**
- Each class/function should have only one reason to change
- Keep functions small and focused on a single task

```python
# ❌ Bad
class UserManager:
    def create_user(self, data):
        # Validate data
        # Save to database
        # Send email
        # Log activity
        # Update cache
        pass

# ✅ Good
class UserService:
    def create_user(self, data):
        validated_data = self.validator.validate(data)
        user = self.repository.save(validated_data)
        self.notifier.send_welcome_email(user)
        self.logger.log_user_created(user)
        return user
```

### 2. **Don't Repeat Yourself (DRY)**
- Avoid code duplication
- Extract common functionality into reusable functions/classes

```typescript
// ❌ Bad
const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validateUserEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// ✅ Good
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateEmail = (email: string): boolean => {
    return EMAIL_REGEX.test(email);
};
```

### 3. **Meaningful Names**
- Use descriptive names for variables, functions, and classes
- Names should reveal intent

```python
# ❌ Bad
def get_data():
    pass

def process():
    pass

# ✅ Good
def get_user_by_id(user_id: int):
    pass

def validate_user_credentials(username: str, password: str):
    pass
```

### 4. **Small Functions**
- Keep functions small (ideally under 20 lines)
- One function should do one thing

```python
# ❌ Bad
def handle_user_registration(data):
    # 50+ lines of code
    pass

# ✅ Good
def handle_user_registration(data):
    validated_data = validate_registration_data(data)
    user = create_user(validated_data)
    send_welcome_email(user)
    log_registration(user)
    return user
```

## 🏗️ Architecture Patterns

### 1. **Service Layer Pattern**
- Separate business logic from controllers
- Use services for complex operations

```python
# Controller
@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        result = auth_service.authenticate_user(data['username'], data['password'])
        return jsonify(result)
    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({'error': 'Authentication failed'}), 500

# Service
class AuthService:
    def authenticate_user(self, username: str, password: str) -> Dict[str, Any]:
        # Business logic here
        pass
```

### 2. **Repository Pattern**
- Abstract data access logic
- Make testing easier

```python
class UserRepository:
    def get_by_id(self, user_id: int) -> Optional[User]:
        return User.query.get(user_id)
    
    def create(self, user_data: Dict) -> User:
        user = User(**user_data)
        db.session.add(user)
        db.session.commit()
        return user
```

### 3. **Factory Pattern**
- Use for object creation
- Centralize configuration

```python
def create_app(config_class=Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)
    # Initialize extensions
    # Register blueprints
    return app
```

## 🎯 Best Practices

### 1. **Error Handling**
- Use specific exception types
- Provide meaningful error messages
- Log errors appropriately

```python
# ❌ Bad
try:
    user = User.query.get(user_id)
    return user.to_dict()
except:
    return None

# ✅ Good
try:
    user = User.query.get(user_id)
    if not user:
        raise UserNotFoundError(f"User with ID {user_id} not found")
    return user.to_dict()
except UserNotFoundError as e:
    logger.warning(f"User not found: {e}")
    return jsonify({'error': str(e)}), 404
except Exception as e:
    logger.error(f"Unexpected error: {e}")
    return jsonify({'error': 'Internal server error'}), 500
```

### 2. **Type Hints**
- Use type hints for better code documentation
- Improve IDE support and catch errors early

```python
from typing import Optional, List, Dict, Any

def get_user_by_email(email: str) -> Optional[User]:
    pass

def create_user(user_data: Dict[str, Any]) -> User:
    pass

def get_all_users() -> List[User]:
    pass
```

### 3. **Documentation**
- Write clear docstrings
- Document complex logic
- Keep comments up to date

```python
def authenticate_user(username: str, password: str) -> Dict[str, Any]:
    """
    Authenticate user with database or system authentication.
    
    Args:
        username: Username to authenticate
        password: Password to verify
        
    Returns:
        Dict containing authentication result with keys:
        - success: bool
        - user: User object (if successful)
        - token: JWT token (if successful)
        - error: str (if failed)
        
    Raises:
        AuthenticationError: If authentication fails
    """
    pass
```

### 4. **Testing**
- Write unit tests for business logic
- Use meaningful test names
- Follow AAA pattern (Arrange, Act, Assert)

```python
def test_authenticate_user_success():
    # Arrange
    username = "testuser"
    password = "testpass"
    user = User(username=username)
    user.set_password(password)
    
    # Act
    result = auth_service.authenticate_user(username, password)
    
    # Assert
    assert result['success'] is True
    assert result['user'].username == username
    assert 'token' in result
```

## 🔧 Code Organization

### 1. **File Structure**
```
backend/
├── app.py                 # Application entry point
├── config.py             # Configuration management
├── models/               # Database models
├── services/             # Business logic
├── routes/               # API endpoints
├── utils/                # Utility functions
└── tests/                # Test files

frontend/
├── src/
│   ├── components/       # React components
│   ├── hooks/           # Custom hooks
│   ├── services/        # API services
│   ├── types/           # TypeScript types
│   └── utils/           # Utility functions
```

### 2. **Import Organization**
```python
# Standard library imports
import os
import sys
from datetime import datetime
from typing import Optional, List

# Third-party imports
from flask import Flask, jsonify
from sqlalchemy import Column, Integer, String

# Local imports
from models.user import User
from services.auth_service import AuthService
from utils.logger import setup_logger
```

### 3. **Component Structure**
```typescript
// Component file structure
import React, { useState, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { User } from '../types/user';

interface ComponentProps {
    // Props interface
}

const Component: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
    // State declarations
    const [state, setState] = useState();
    
    // Custom hooks
    const { data, loading, error } = useApi('/api/endpoint');
    
    // Event handlers
    const handleClick = useCallback(() => {
        // Handler logic
    }, []);
    
    // Render logic
    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorMessage error={error} />;
    
    return (
        <div>
            {/* JSX */}
        </div>
    );
};

export default Component;
```

## 🚀 Performance Considerations

### 1. **Database Queries**
- Use eager loading to avoid N+1 queries
- Add proper indexes
- Use pagination for large datasets

```python
# ❌ Bad - N+1 query problem
users = User.query.all()
for user in users:
    print(user.roles)  # Additional query for each user

# ✅ Good - Eager loading
users = User.query.options(joinedload(User.roles)).all()
for user in users:
    print(user.roles)  # No additional queries
```

### 2. **Frontend Optimization**
- Use React.memo for expensive components
- Implement proper memoization
- Use lazy loading for routes

```typescript
// Memoized component
const ExpensiveComponent = React.memo(({ data }) => {
    return <div>{/* Component logic */}</div>;
});

// Memoized value
const expensiveValue = useMemo(() => {
    return computeExpensiveValue(data);
}, [data]);
```

### 3. **Caching**
- Cache frequently accessed data
- Use appropriate cache invalidation strategies
- Consider CDN for static assets

## 📝 Code Review Checklist

### Before Submitting Code
- [ ] Code follows naming conventions
- [ ] Functions are small and focused
- [ ] No code duplication
- [ ] Proper error handling
- [ ] Type hints included (Python/TypeScript)
- [ ] Documentation updated
- [ ] Tests written and passing
- [ ] No console.log statements in production code
- [ ] Security considerations addressed
- [ ] Performance impact considered

### During Code Review
- [ ] Code is readable and understandable
- [ ] Logic is correct and efficient
- [ ] Error handling is appropriate
- [ ] Tests cover edge cases
- [ ] No security vulnerabilities
- [ ] Follows project conventions
- [ ] Documentation is clear and accurate

## 🛠️ Tools and Linters

### Python
- **Black**: Code formatter
- **Flake8**: Linter
- **MyPy**: Type checker
- **Pytest**: Testing framework

### TypeScript/JavaScript
- **ESLint**: Linter
- **Prettier**: Code formatter
- **TypeScript**: Type checker
- **Jest**: Testing framework

### Configuration Files
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

```ini
# .flake8
[flake8]
max-line-length = 88
extend-ignore = E203, W503
```

## 📚 Resources

### Books
- "Clean Code" by Robert C. Martin
- "Refactoring" by Martin Fowler
- "The Pragmatic Programmer" by Andrew Hunt and David Thomas

### Online Resources
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)
- [Python Clean Code](https://github.com/zedr/clean-code-python)
- [React Best Practices](https://react.dev/learn)

---

*Remember: Clean code is not about perfection, but about continuous improvement. Start with small changes and gradually improve your codebase.* 