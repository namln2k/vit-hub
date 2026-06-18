The commit message must follow the Conventional Commits specification. The format is as follows:

```<type>: <description>

```

Where:

- `<type>` is a noun that describes the type of change being made. Common types include
  - `build`: Changes that affect the build system or external dependencies
  - `chore`: Changes that do not modify src or test files
  - `ci`: Changes to our CI configuration files and scripts
  - `docs`: Documentation only changes
  - `feat`: A new feature
  - `fix`: A bug fix
  - `perf`: A code change that improves performance
  - `refactor`: A code change that neither fixes a bug nor adds a feature
  - `revert`: Reverts a previous commit
  - `style`: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
  - `test`: Adding missing tests or correcting existing tests
- `<description>` is a short description of the change.

The commit message should be concise and descriptive, providing enough information for others to understand the purpose of the change.
It should also be written in the imperative mood, as if giving a command (e.g., "Add feature" instead of "Added feature").
It should be short and to the point, ideally less than 50 characters for the description.
