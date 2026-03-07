## Task List

Rules:

- Unchecked tasks (`- [ ]`) are TODO.
- Checked tasks (`- [x]`) are completed and must be ignored as TODO.
- Mark tasks as checked immediately after completion.

### Frontend Refactor

- [x] Remove staging in the lobby and directly show the daily challenge results if there are of the possibility to play the challenge.
  `{stage === 'READY' ? (
      <button
        onClick={() => void continueFlow()}
        disabled={isLoading || !sessionToken}
        className="px-12 py-6 bg-black text-white text-2xl font-display font-black uppercase hover:bg-[#00FF00] hover:text-black transition-all border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
      >
        {isLoading ? 'Checking Daily...' : 'Continue'}
      </button>
    )`
  Goal should be to remove the READY stage and directly show the step skipping the `continueFlow` completly. This will streamline the user experience and reduce unnecessary steps in the lobby.
