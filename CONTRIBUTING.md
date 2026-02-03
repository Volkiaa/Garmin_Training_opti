# Contributing Guidelines

## Commit Message Convention

This project uses **Conventional Commits**. All commits MUST follow this format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types (required)

| Type | Description |
|------|-------------|
| `feat` | New feature or functionality |
| `fix` | Bug fix |
| `docs` | Documentation only changes |
| `style` | Code style changes (formatting, semicolons, etc.) |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `build` | Changes to build system or dependencies |
| `ci` | Changes to CI configuration |
| `chore` | Other changes that don't modify src or test files |
| `revert` | Reverts a previous commit |

### Scope (optional but recommended)

The scope indicates what part of the codebase is affected:

- `frontend` - React/TypeScript frontend changes
- `backend` - Python/FastAPI backend changes
- `api` - API endpoint changes
- `db` - Database schema or migrations
- `auth` - Authentication related
- `sync` - Garmin data synchronization
- `ui` - User interface components
- `deps` - Dependency updates

### Examples

```
feat(frontend): add workout calendar view
fix(backend): resolve race condition in sync endpoint
docs: update API documentation
refactor(api): extract validation logic to separate module
test(backend): add unit tests for training load calculator
ci: add Python type checking to workflow
chore(deps): update React to v18.3
```

### Rules

1. **Use imperative mood**: "add feature" not "added feature" or "adds feature"
2. **Don't capitalize** the first letter of description
3. **No period** at the end of the subject line
4. **Keep subject line under 72 characters**
5. **Separate subject from body with blank line** (if body is used)

### Breaking Changes

For breaking changes, add `!` after the type/scope or add `BREAKING CHANGE:` in the footer:

```
feat(api)!: change authentication endpoint response format

BREAKING CHANGE: The /auth/login endpoint now returns a different JSON structure.
```

---

## Branch Naming

Use descriptive branch names:

```
feat/add-calendar-view
fix/sync-timeout-error
docs/api-documentation
refactor/extract-auth-module
```

---

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes following the commit convention
3. Ensure CI passes (lint, tests, type checks)
4. Request review
5. Squash and merge (or merge commit for complex PRs)

---

## Code Style

### Frontend (TypeScript/React)
- ESLint enforces code style
- Run `npm run lint` before committing

### Backend (Python)
- **black** for formatting
- **isort** for import sorting
- **flake8** for linting
- **mypy** for type checking

Run before committing:
```bash
cd backend
black .
isort .
flake8 .
mypy .
```
