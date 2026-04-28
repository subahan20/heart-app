// GlobalOnboardingGate has been intentionally disabled.
// Access control is now fully handled at the component level:
// - Home.jsx: guarded openModal() redirects GUEST → /auth, PENDING → /onboarding
// - HomeHeader.jsx: handleGuardedAction() does the same for header buttons
// This allows the home page to render freely for all users.
export function GlobalOnboardingGate() {
  return null
}
