# Stawi AI-Native Agent System

Six specialized subagents power Stawi's build and operations. Each is defined as a
subagent in this folder and can be invoked by the orchestrator (the main session)
via the Agent/Task tool. They share goals, skills, tools, and a **recursive
context layer**.

## The agents

| Agent | Role | Key tools |
|-------|------|-----------|
| **research-agent** | Market, regulatory, competitive & venture research. Cites every fact. | WebSearch, WebFetch |
| **operation-agent** | Identify → analyze → fix → update → rebuild the codebase. Keeps tests green. | Read/Write/Edit, Bash |
| **support-agent** | End-user & official support, FAQs, in-app copy, troubleshooting. | Read, Write, WebSearch |
| **sales-agent** | Growth, onboarding, the constituency→global hierarchy, subscriptions. | Read, Write, WebSearch |
| **finance-agent** | Verifies tax/levy, P&L, capital-ratio & pricing math. Not advice. | Read/Write/Edit, Bash |
| **legal-agent** | SHG/SACCO registration, bylaws, data protection, terms. Not legal advice. | Read, Write, WebSearch/Fetch |

## Operating principles (shared)

1. **Goals first** — use AskUserQuestion to confirm the goal before non-trivial work.
2. **Skills** — free to go beyond saved skills and propose new ones.
3. **Tools** — free to search, connect, customize and use the right tools.
4. **Context** — always improve the provided context from research; never fabricate.

## Recursive Context Layer

A loop that turns raw inputs into compounding value. Each cycle should leave the
stored context **better** than it found it.

```
1. CAPTURE   — editors, mail, browsing history, preferences, all sources.
2. CURATE    — read, clean, file, ignore, act on it (routines).
3. STORE     — make context legible: PRD.md, /research notes, memory files.
4. EXECUTE   — leverage context: set goals, ideate, build artifacts, run skills/tasks, review & ship.
5. EXPERIENCE— context becomes value: pilot, realize value, gather feedback,
               retain/refer, and send signal back to the brain layer (→ CAPTURE).
```

Every agent writes what it learns back into layer 3 (Store) so the next pass is
smarter. Stale facts (e.g. tax rates, competitor pricing) are flagged in `PRD.md` §6.

## Invocation

From the main session, delegate with the Agent/Task tool, naming the subagent,
e.g. *"Use the research-agent to refresh 2026 KRA VAT thresholds and update the
PRD."* The orchestrator coordinates multi-agent work (e.g. legal-agent +
finance-agent + research-agent for a new country's compliance pack).

## Always
- Push and save work to GitHub.
- Keep money in integer cents; cite sources; respect the brand.
