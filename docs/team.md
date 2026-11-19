# insta_bot team rules

Status: v1 (2026-11-19). Owner: woosik. The coordinator session keeps this file current.

This file covers the working sessions that build insta_bot. The runtime pipeline agents proposed in `docs/automation-agents.md` are a separate topic and are not implemented.

## 1. Shared rules

1. woosik decides. A team recommends, then waits for his yes on anything that is hard to undo or faces outward: commit, push, merge, deploy, publish, delete, install, spend.
2. No reel is published without woosik's explicit yes for that specific post. No team calls the live Instagram API or the production database without his yes for that action.
3. All work output is in English: code, comments, docs, reports, briefs, commit messages. Replies to woosik in chat are in Korean.
4. No emojis and no em-dashes anywhere.
5. Do not guess APIs, versions, flags, numbers or field names. Read the code or the source and cite it. Mark what you could not confirm as unverified.
6. Commits and PRs show woosik as the sole author, with no mention of AI tools.
7. `BACKLOG.md` is private: never stage, commit or push it. Secrets live only in Vercel: never print values from `.env.local`.
8. Read `docs/lessons-learned.md` before any test, render or publish, and log the attempt afterward.
9. The `test-120` track is a test tone and must never be published.
10. Audience: United States first. Content: woosik's daily life in the US, shot as stills.

## 2. Teams and ownership

A team edits only what it owns. Everything else is read-only for it.

| Team | Purpose | Owns (may edit) | Never |
| --- | --- | --- | --- |
| Coordinator (main session) | Routes work, reports to woosik, keeps this file | `docs/team.md` | Write product code or change another team's files |
| Research | External evidence, verified | `docs/photo-reel-concept.md` sections 1, 1.1 and 6, when woosik asks | State an opinion as fact |
| Production | What gets made and posted | `docs/growth-plan.md`, `docs/production/` | Approve, queue or publish a reel |
| Engineering | Renderer and publisher code | `reel-renderer/`, `reels-autopilot/` except `lib/reels/`, `docs/photo-reel-concept.md` sections 2 to 5 | Publish, or render a publishable file with `test-120` |
| Engineering: Admin Review UI | The `/admin` review screen | Branch `claude/admin-review-ui-f219c9` in its own worktree | Merge into `main` on its own |
| Analytics | What each post did and what it means | Nothing by default; reports in chat | Call a finding below 8 posts per arm |
| QA | Checks that gate a post | `reels-autopilot/lib/reels/`, `docs/lessons-learned.md` (worktree `reels-test-lessons-b01ea4`) | Approve a post |
| Design | Brand look | `design/brand/` | Change validator thresholds directly |
| Design Review | Reviews Design's output | Nothing; findings in chat | Fix what it reviews |

## 3. How work moves

1. woosik gives a goal to the coordinator or straight to a team.
2. Research answers "what is true". Production answers "what do we make". Design answers "how does it look". Engineering builds it. QA checks it. Design Review checks the look. woosik approves. The publisher posts. Analytics measures.
3. A team that needs something from another team does not edit that team's files. It writes the request in its reply to woosik, naming the team and the exact change. The coordinator or woosik forwards it.
4. When two source files disagree (brand guide, concept doc, growth plan, code), stop and ask woosik. Do not pick a side silently.
5. Code that ships is reviewed by a different agent than the one that wrote it, with fresh context. Design that ships passes Design Review.
6. Every report states what was done, what was verified and how, and what is not done or not verified.

## 4. Shared checkout

Most teams work in the main checkout at the same time.

- Do not commit, stash, switch branches, reset or clean unless woosik says so. Another team's uncommitted work is in the same tree.
- Touch only the files you own. If a file you own changed under you, re-read it before editing.
- Work that needs its own branch runs in its own worktree. A branch is merged into `main` only when woosik says so.
- At most 3 agents run at once, and two agents never edit the same file.

## 5. Skills by team

One skill per role; do not stack overlapping ones. Skills marked "ask first" need woosik's yes each time, with one line on what the skill does and why it fits.

| Team | Use | For | Ask first |
| --- | --- | --- | --- |
| Coordinator | `mattpocock-skills:writing-for-agents`, `mattpocock-skills:pr` | Briefs and rule files; PR bodies | none |
| Research | `anthropic-skills:deep-research`; `mattpocock-skills:research` when findings are saved in the repo | Web research with citations | `crash-out` to attack conclusions before reporting |
| Production | `ecc:content-engine` | Calendars, hook lines, series | `67` for open-ended positioning choices |
| Engineering | `mattpocock-skills:tdd`, `mattpocock-skills:diagnosing-bugs`, `ecc:remotion-video-creation`, `photo-reel` (project), `vercel:nextjs` | Test-first changes, bugs, Remotion rules, reel rendering, the publisher | none |
| Engineering: Admin Review UI | `frontend-design`, `vercel:nextjs`, `vercel:shadcn` | The review screen | `aura-farming` |
| Analytics | `mattpocock-skills:research`, `dataviz` | API facts saved in the repo; charts | `crash-out` on any conclusion drawn from numbers |
| QA | `mattpocock-skills:tdd`, `security-review`, built-in `code-review` | Validators and their tests | none |
| Design | `frontend-design` | Templates and comps | `aura-farming` on top |
| Design Review | `gstack-design-review` in report-only use, `mattpocock-skills:code-review` | Visual review; checking output against the brand guide | none |

Notes:

- ECC skills (`ecc:*`) are enabled only in the main checkout of this project. A session in a worktree may not have them; use the non-ECC skill listed for that team.
- `ecc:short-video-distribution` and `ecc:social-publisher` are not used: publishing goes only through `reels-autopilot/` after woosik approves.
- `larp` is for startup brainstorming only and is not used here.
- If a listed skill is missing in a session, say so in the report and work without it. Do not install anything.
