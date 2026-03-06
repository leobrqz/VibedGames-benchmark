# Contributing to VibedGames-benchmark

Thanks for your interest in contributing.

This repository is a satire project: games are intentionally "vibe coded" and not meant to be scientific benchmarks. Contributions are welcome as long as they follow the project rules below.

## Table of Contents

- [Project Rules](#project-rules)
- [What You Can Contribute](#what-you-can-contribute)
- [Development Setup](#development-setup)
- [Contribution Workflow](#contribution-workflow)
- [Pull Request Requirements](#pull-request-requirements)
- [Game Folder Requirements](#game-folder-requirements)
- [Style Guidelines](#style-guidelines)
- [Reporting Issues](#reporting-issues)
- [License](#license)

## Project Rules

- All game code must be fully AI-generated.
- Human-written code is not allowed for game implementation.
- Every game contribution must include prompt artifacts documenting how it was generated.
- Keep the repository tone aligned with the satirical benchmark concept.
- Be respectful and constructive in issues and pull requests.

## What You Can Contribute

- New games in their own folder.
- Improvements to existing games.
- Bug fixes and refactors that preserve game behavior.
- Documentation improvements (README, setup instructions).
- Tooling and script improvements for multi-game workflow.

## Development Setup

1. Clone the repository.
2. Install dependencies:
	 ```bash
	 npm install
	 ```
3. Run an existing game (example):
	 ```bash
	 npm run dev:voxel-rpg
	 ```

For new games, follow the same script naming pattern:

- `dev:<game-name>`
- `build:<game-name>`
- `preview:<game-name>`

## Contribution Workflow

1. Fork the repository.
2. Create a branch from `main`.
3. Make your changes.
4. Validate your game runs locally.
5. Open a pull request with the required details.

Recommended branch naming:

- `game/<short-description>`
- `feat/<short-description>`
- `fix/<short-description>`
- `docs/<short-description>`

## Pull Request Requirements

Your PR description should include:

- Summary of what changed.
- Why the change was made.
- Which game folder is affected.
- Model(s) used (example: GPT 5.4).
- Any known limitations.

Checklist:

- [ ] Changes follow project rules.
- [ ] Game runs locally with the documented command.
- [ ] `README.md` is updated if needed.
- [ ] Prompt files are included and complete.
- [ ] No unrelated files were changed.

## Game Folder Requirements

Each game must live in its own folder and include:

- `prompt.md`  
	The initial prompt used to generate the game.
- `prompt_history.md`  
	Iterative prompt history showing how the result evolved, for changes to existing games or new games with multiple iterations.
- `vite.config.js`  
	Game-specific Vite config.
- `index.html` and source files under `src/`.

Also update root `package.json` scripts for the new game:

- `dev:<game-name>`
- `build:<game-name>`
- `preview:<game-name>`

And add the game entry to `README.md` with:

- Game name and short description.
- Model(s) used.

## Style Guidelines

- Keep structure consistent with existing game folders.
- Prefer clear naming and small, focused changes.
- Avoid adding heavy dependencies unless justified.
- Keep docs concise and explicit about AI generation details.

## Reporting Issues

When opening an issue, include:

- Expected behavior.
- Actual behavior.
- Steps to reproduce.
- Affected game folder.
- Environment details (OS, Node version, browser if relevant).

## License

By contributing, you agree that your contributions are licensed under the repository's MIT License.
