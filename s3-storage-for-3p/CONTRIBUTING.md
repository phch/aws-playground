# Contributing to S3 Storage Browser

Thank you for your interest in contributing to the S3 Storage Browser project! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors, regardless of background or experience level.

### Expected Behavior

- Be respectful and considerate
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Accept criticism gracefully
- Prioritize the project's best interests

### Unacceptable Behavior

- Harassment or discrimination
- Trolling or insulting comments
- Publishing others' private information
- Unprofessional conduct

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker and docker-compose (optional)
- AWS CLI configured
- Git

### Setting Up Development Environment

1. **Fork the Repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/your-username/s3-storage-for-3p.git
   cd s3-storage-for-3p
   ```

2. **Run Setup Script**
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

3. **Configure Environment**
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Edit backend/.env with your AWS credentials
   
   # Frontend
   cp frontend/.env.example frontend/.env
   # Edit frontend/.env with your configuration
   ```

4. **Start Development Servers**
   ```bash
   # Terminal 1 - Backend
   cd backend
   source venv/bin/activate
   python main.py
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

## Development Process

### Branching Strategy

We use Git Flow:

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Urgent production fixes

### Creating a Feature Branch

```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

### Making Changes

1. Make your changes in small, logical commits
2. Write clear commit messages
3. Keep commits focused on a single change
4. Test your changes thoroughly

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(s3): add batch upload functionality

Implement batch upload with progress tracking for multiple files.
Users can now drag and drop multiple files at once.

Closes #123
```

```
fix(auth): resolve token refresh race condition

Fixed issue where multiple simultaneous requests could cause
token refresh to fail intermittently.

Fixes #456
```

## Coding Standards

### Python (Backend)

**Style Guide:** Follow PEP 8

```python
# Good
def get_user_objects(user_id: str, prefix: str = "") -> List[S3Object]:
    """
    Get S3 objects for a user.
    
    Args:
        user_id: The user's unique identifier
        prefix: Optional prefix to filter objects
    
    Returns:
        List of S3 objects
    """
    service = S3Service(user_id)
    return await service.list_objects(prefix)

# Bad
def getUserObjects(userId, prefix=""):
    service=S3Service(userId)
    return await service.list_objects(prefix)
```

**Key Points:**
- Use type hints
- Write docstrings for all functions
- Keep functions small and focused
- Handle errors appropriately
- Use async/await for I/O operations

**Tools:**
```bash
# Format code
black backend/

# Check style
flake8 backend/

# Type checking
mypy backend/
```

### TypeScript/React (Frontend)

**Style Guide:** Follow Airbnb JavaScript Style Guide

```typescript
// Good
interface UserProfile {
  id: string;
  username: string;
  email: string;
}

const UserCard: React.FC<{ user: UserProfile }> = ({ user }) => {
  return (
    <Card>
      <Typography variant="h6">{user.username}</Typography>
      <Typography variant="body2">{user.email}</Typography>
    </Card>
  );
};

// Bad
const UserCard = (props) => {
  return (
    <Card>
      <Typography variant="h6">{props.user.username}</Typography>
      <Typography variant="body2">{props.user.email}</Typography>
    </Card>
  )
}
```

**Key Points:**
- Use TypeScript strict mode
- Define interfaces for all props
- Use functional components with hooks
- Keep components small and reusable
- Use proper prop validation

**Tools:**
```bash
# Lint code
npm run lint

# Format code
npm run format

# Type checking
npm run type-check
```

### Infrastructure (Terraform/CDK)

```hcl
# Good - Terraform
resource "aws_s3_bucket" "storage" {
  bucket = "${var.environment}-storage-${data.aws_caller_identity.current.account_id}"
  
  tags = merge(
    var.common_tags,
    {
      Name = "Storage Bucket"
      Purpose = "User file storage"
    }
  )
}

# Bad - Terraform
resource "aws_s3_bucket" "storage" {
  bucket = "my-bucket"
}
```

## Testing Guidelines

### Backend Tests

**Structure:**
```
tests/
├── __init__.py
├── test_auth.py
├── test_s3_service.py
├── test_credentials_service.py
└── conftest.py
```

**Writing Tests:**
```python
import pytest
from unittest.mock import Mock, patch

class TestS3Service:
    @pytest.fixture
    def s3_service(self):
        with patch('boto3.client'):
            return S3Service(user_id='test-user')
    
    @pytest.mark.asyncio
    async def test_list_objects_success(self, s3_service):
        """Test successful object listing."""
        s3_service.s3_client.list_objects_v2 = Mock(return_value={
            'Contents': [...]
        })
        
        result = await s3_service.list_objects()
        
        assert len(result.objects) > 0
        assert result.has_more == False
```

**Running Tests:**
```bash
cd backend
pytest                          # Run all tests
pytest tests/test_auth.py      # Run specific test file
pytest -v                       # Verbose output
pytest --cov=app               # With coverage
```

### Frontend Tests

```typescript
// Component test
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('should submit form with credentials', async () => {
    const onSubmit = jest.fn();
    render(<LoginForm onSubmit={onSubmit} />);
    
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' }
    });
    
    fireEvent.click(screen.getByText('Login'));
    
    expect(onSubmit).toHaveBeenCalledWith({
      username: 'testuser',
      password: 'password123'
    });
  });
});
```

### Test Coverage

Maintain minimum coverage:
- Backend: 80%
- Frontend: 70%
- Integration tests for critical paths

## Pull Request Process

### Before Submitting

1. **Update from develop**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout feature/your-feature
   git rebase develop
   ```

2. **Run Tests**
   ```bash
   # Backend
   cd backend && pytest
   
   # Frontend
   cd frontend && npm test
   ```

3. **Check Code Quality**
   ```bash
   # Backend
   black backend/ && flake8 backend/
   
   # Frontend
   npm run lint
   ```

4. **Update Documentation**
   - Update README.md if needed
   - Update API.md for API changes
   - Add entries to CHANGELOG.md

### Submitting Pull Request

1. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature
   ```

2. **Create Pull Request on GitHub**
   - Use descriptive title
   - Fill out PR template
   - Link related issues
   - Add screenshots for UI changes

3. **PR Template**
   ```markdown
   ## Description
   Brief description of changes
   
   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update
   
   ## Testing
   - [ ] Unit tests added/updated
   - [ ] Integration tests added/updated
   - [ ] Manual testing performed
   
   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Comments added for complex code
   - [ ] Documentation updated
   - [ ] No new warnings generated
   - [ ] Tests pass locally
   
   ## Screenshots (if applicable)
   
   ## Related Issues
   Closes #issue_number
   ```

### Review Process

1. At least one maintainer must review
2. All CI checks must pass
3. Address review comments
4. Maintain clean commit history
5. Squash commits if needed

### After Approval

- Maintainer will merge PR
- Delete feature branch
- PR will be included in next release

## Reporting Bugs

### Before Reporting

1. Check existing issues
2. Verify bug in latest version
3. Try to reproduce consistently
4. Collect relevant information

### Bug Report Template

```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., Ubuntu 22.04]
- Browser: [e.g., Chrome 120]
- Node version: [e.g., 18.17.0]
- Python version: [e.g., 3.11.5]

## Screenshots
If applicable

## Additional Context
Any other relevant information

## Possible Solution
If you have ideas
```

## Suggesting Features

### Feature Request Template

```markdown
## Feature Description
Clear description of the feature

## Problem it Solves
What problem does this address?

## Proposed Solution
How should it work?

## Alternatives Considered
Other approaches you've thought about

## Additional Context
Any other relevant information

## Would you like to implement this?
- [ ] Yes, I can submit a PR
- [ ] No, but I can help test
- [ ] No, just suggesting
```

## Development Tips

### Debugging

**Backend:**
```python
# Use Python debugger
import pdb; pdb.set_trace()

# Or VS Code launch.json
{
  "name": "Python: FastAPI",
  "type": "python",
  "request": "launch",
  "module": "uvicorn",
  "args": ["main:app", "--reload"]
}
```

**Frontend:**
```typescript
// Use React DevTools
// Use Redux DevTools for state inspection
// Chrome DevTools for network inspection
```

### Common Issues

**Issue: Import errors in Python**
```bash
# Ensure virtual environment is activated
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

**Issue: Node modules issues**
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Questions?

- Check documentation in README.md
- Search existing issues
- Ask in discussions
- Contact maintainers

Thank you for contributing!
