# Testing Guide for MemoryLane

This document provides information about the unit test suite for the MemoryLane app.

## Setup

Install test dependencies:
```bash
npm install
```

## Running Tests

Run all tests:
```bash
npm test
```

Run tests in watch mode (for development):
```bash
npm run test:watch
```

Run tests with coverage report:
```bash
npm run test:coverage
```

## Test Structure

Tests are organized in the `__tests__` directory:

```
__tests__/
  utils/
    dateHelper.test.js
    errorHandler.test.js
    networkCheck.test.js
    theme.test.js
    audioHelper.test.js
```

## Test Coverage

The test suite currently covers:

### Utility Functions
- **dateHelper**: Date formatting and relative time calculations
- **errorHandler**: Error message formatting and display
- **networkCheck**: Network connectivity checking
- **theme**: Theme constants and color definitions
- **audioHelper**: Audio duration formatting

## Writing New Tests

When adding new tests:

1. Create test files in `__tests__/` directory matching the source file structure
2. Use descriptive test names that explain what is being tested
3. Follow the existing test patterns
4. Mock external dependencies (Firebase, Expo modules, etc.)
5. Test both success and error cases

## Example Test

```javascript
import { formatDate } from '../../utils/dateHelper';

describe('dateHelper', () => {
  it('should return "Today" for today\'s date', () => {
    const today = new Date();
    expect(formatDate(today.toISOString())).toBe('Today');
  });
});
```

## Coverage Goals

The project aims for:
- 70% branch coverage
- 70% function coverage
- 70% line coverage
- 70% statement coverage

## Continuous Integration

Tests should be run before committing code. Consider setting up CI/CD to run tests automatically on pull requests.

