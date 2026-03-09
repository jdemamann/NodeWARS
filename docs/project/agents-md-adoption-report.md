# AGENTS.md Adoption Report

## Recommendation

Yes, this project should have a repository-level `AGENTS.md`.

This codebase now has:

- meaningful gameplay rules
- multiple regression layers
- campaign-specific balance assumptions
- synchronized UI / tutorial / persistence constraints
- a large amount of project memory that is expensive to rediscover

Without an `AGENTS.md`, every new session pays that rediscovery cost again.

## What `AGENTS.md` Should Do

It should not replace the full docs set.

It should:

- tell the next agent where to start reading
- state the current development phase
- list critical invariants
- point to canonical rule entry points
- list the required validation commands
- warn about high-risk files
- summarize the best next steps

## What It Should Not Do

- duplicate the full implementation docs
- contain long historical narrative
- become a second backlog
- hold tuning detail that already lives in campaign docs

If it gets too long, it stops being used.

## What Was Added

A project-level `AGENTS.md` was added at the repository root.

It captures:

- current project state
- first files to read
- source structure
- canonical gameplay entry points
- critical invariants
- required validation commands
- key documentation map
- current campaign balance context
- workflow expectations
- high-risk files
- best next steps

## Process To Keep It Useful

Update `AGENTS.md` only when one of these changes:

- current development phase
- canonical gameplay entry point
- required validation commands
- critical invariant
- source structure
- top-priority next steps

Everything else should stay in the more detailed docs.

## Maintenance Tasks

### Immediate

- keep `AGENTS.md` aligned with future balance-wave decisions
- update it if campaign progression or validation scripts change

### Short Term

- after the next playtest wave, refresh the “Current Best Next Steps” section
- if a fidelity phase starts, update the project phase and priorities

### Ongoing

- whenever a new guardrail script is added, list it in `AGENTS.md`
- whenever a canonical rule owner changes, update the entry point list
- when docs move directories, update the “First Files To Read” section

## Suggested Development Habit

For future work, use this sequence:

1. read `AGENTS.md`
2. read the 3 to 5 linked docs relevant to the task
3. make the change
4. run the listed validation commands
5. update `AGENTS.md` only if the top-level project contract changed

That keeps continuity high without turning the repository into documentation overhead.
