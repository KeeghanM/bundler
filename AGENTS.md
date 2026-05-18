Always start by scanning the repo root (and obvious subfolders like /docs, /specs, /prd, /product) for any requirements artefacts: requirements.txt/requirements\*.txt, a PRD, README, coding-standards, architecture notes, ADRs, issue templates, or anything that defines scope, behaviours, and constraints.

Default to single-shot delivery: when asked to plan or implement, optimise for one comprehensive task that lands as one pull request. Avoid splitting into many micro tasks or PRs unless explicitly required.

Bias away from “sniper edits”. When you implement, implement properly: large, end-to-end, production-quality changes are expected, potentially thousands of lines if that’s what the requirements demand.

Code quality bar: write good code that is testable, verifiable, and high confidence. Add or update tests for major behaviours, and make changes easy to review.

Prefer the simplest implementation that solves the real problem. Start with root-cause checks (configuration, environment variables, deployment/runtime settings, and operator error) before adding or changing code.

Do not solve configuration mistakes with permanent code paths unless there is an explicit product requirement. If a variable, secret, URL, or environment value is wrong, call that out directly and recommend fixing the source configuration first.

Avoid over-engineering:

- Choose the smallest viable change that fully resolves the issue.
- Add new helpers/abstractions only when there is clear repeated need (not single-use patching).
- Keep tests aligned to intended behaviour; do not add tests that lock in unnecessary complexity.

Keep tight traceability to requirements: continuously map what you’re building back to the requirements artefacts so scope stays correct and reviewers can see why each change exists.

Maintain a running to-do list in the repo (or in a clearly referenced place) and, for larger work, include both:

- a concise implementation plan
- a to-do list that links each item to plan sections and requirements
  This creates breadcrumb notes so another agent can pick up quickly and continue without re-deriving context.

Use Atomic Conventional Commits: each commit should represent a single logical change, with a clear message that describes the intent and scope of the change. This makes it easier for reviewers to understand the purpose of each change and for future maintainers to trace the history of changes. Commit work as you go, rather than batching large changes into a single commit at the end. This allows for better traceability and easier debugging if issues arise.

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.

<!--VITE PLUS END-->

<!-- HUMN START -->

# Documentation for Humn, The organic, human-centric UI library for the modern web.

This project is using Humn, a complete, reactive frontend library with built in state management designed to replace the likes of React/Svelte/Solid AND Zustand/Kea/Redux in your stack.

It rejects the complexity of modern frameworks; no stale closures, no "Hook Rules", and no heavy compilers. Humn decouples your application's Cortex (Logic/State) from its Body (View), creating applications that are easy to reason about, simple to test, and naturally reactive.

As it was built by me, the documentation is available locally at '/home/eeghancarry/repos/keeghan/humn/docs/index.md'

<!-- HUMN END -->
