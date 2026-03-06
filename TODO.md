## Task List

Rules:

- Unchecked tasks (`- [ ]`) are TODO.
- Checked tasks (`- [x]`) are completed and must be ignored as TODO.
- Mark tasks as checked immediately after completion.

### Frontend Refactor

- [x] Replace `mode=""` UI switching with Next.js route-based navigation.
  Route explanation:
    - `/`:
        - Purpose: waiting/lobby view.
        - Must represent current `mode="wait"` behavior.
    - `/game`:
        - Purpose: game chat/play view.
        - Must contain the current gameplay/chat experience.
          Acceptance criteria:
    - No `mode=""` branching remains as the primary page switch mechanism.
    - Navigation between waiting state and game chat uses routes (`/` and `/game`).
