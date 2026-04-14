# Mock SVN CLI for Testing

This directory contains a mock SVN command-line tool for testing the SVN merge tool.

## Usage

The mock SVN is located at `test/bin/svn` and can be used by setting the `PATH` environment variable:

```bash
export PATH="$(pwd)/test/bin:$PATH"
svn status
```

Or by setting it inline:

```bash
TEST_SCENARIO=text-conflicts node test/bin/svn status
```

## Test Scenarios

The mock SVN supports multiple test scenarios via the `TEST_SCENARIO` environment variable:

### Available Scenarios

1. **text-conflicts** - Multiple text file conflicts
   - `src/file1.ts`
   - `src/file2.ts`
   - `docs/readme.md`

2. **property-conflicts** - Property conflicts
   - `src/config.xml`
   - `lib/`

3. **tree-conflicts** - Tree conflicts
   - `old_folder` (local delete, incoming edit)
   - `moved_file.ts` (local edit, incoming delete)

4. **binary-conflicts** - Binary file conflicts
   - `images/logo.png`
   - `docs/manual.pdf`

5. **mixed-conflicts** - Mix of all conflict types
   - Text: `src/app.ts`
   - Property: `src/config.xml`
   - Tree: `old_folder`
   - Binary: `images/icon.png`

6. **no-conflicts** - Clean state with no conflicts

## Supported Commands

The mock SVN supports these commands:

### svn status
Shows conflicted files based on the current scenario.

```bash
TEST_SCENARIO=text-conflicts node test/bin/svn status
```

### svn resolve --accept <strategy> <path>
Resolves a conflict with the specified strategy.

```bash
TEST_SCENARIO=text-conflicts node test/bin/svn resolve --accept theirs-full src/file1.ts
```

### svn merge -c <revision> <url>
Simulates a merge operation.

```bash
node test/bin/svn merge -c 1001 ^/branches/feature
```

### svn update
Updates the working copy.

```bash
node test/bin/svn update
```

### svn commit -m <message>
Commits changes (fails if unresolved conflicts exist).

```bash
node test/bin/svn commit -m "Merge changes"
```

### svn info <path>
Shows information about a file or directory.

```bash
node test/bin/svn info src/file1.ts
```

## State Management

Each scenario has a `state.json` file in `test/fixtures/<scenario>/` that tracks:
- Current conflicts
- Resolved status
- Resolution strategy used

The state is automatically updated when you run `svn resolve` commands.

## Example Test Flow

```bash
# Set scenario
export TEST_SCENARIO=text-conflicts

# Check status
node test/bin/svn status
# Output: C       src/file1.ts
#         C       src/file2.ts
#         C       docs/readme.md

# Resolve a conflict
node test/bin/svn resolve --accept theirs-full src/file1.ts
# Output: Resolved conflicted state of 'src/file1.ts'

# Check status again
node test/bin/svn status
# Output: C       src/file2.ts
#         C       docs/readme.md

# Try to commit with unresolved conflicts
node test/bin/svn commit -m "Test"
# Output: svn: E155015: Aborting commit: 'src/file2.ts' remains in conflict

# Resolve remaining conflicts
node test/bin/svn resolve --accept theirs-full src/file2.ts
node test/bin/svn resolve --accept theirs-full docs/readme.md

# Commit successfully
node test/bin/svn commit -m "Merge complete"
# Output: Committed revision 1235.
```

## Resetting State

To reset a scenario's state, simply restore the original `state.json` file or delete it and let the mock recreate it.

## Integration with Tests

In your tests, you can use the mock SVN by:

1. Setting the PATH to include `test/bin`
2. Setting the TEST_SCENARIO environment variable
3. Running your tool which will use the mock SVN

Example:

```typescript
import { execSync } from 'child_process';

const env = {
  ...process.env,
  PATH: `${process.cwd()}/test/bin:${process.env.PATH}`,
  TEST_SCENARIO: 'text-conflicts'
};

execSync('svn status', { env });
```
