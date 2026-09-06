# pr-human-review

Explain an implementation-complete Eazy Review PR for a human acceptance decision.
Existing findings needing triage or fixes select pr-review-remediation instead.

1. Read the current PR/head, approved scope and affected contracts. Use available
   diff, review-thread, automated and interactive evidence; identify stale or
   missing proof rather than silently upgrading it.
2. Trace the user-visible change and highest-risk behavior through the implementation.
   Separate product/behavior decisions for the human from correctness supported
   by automated checks, and from untested native/physical or hosted conditions.
3. Explain the concrete before/after behavior, relevant tradeoff and remaining
   acceptance decisions. Scale the number of questions to the actual change.
4. Recommend readiness or identify the specific missing proof. Human acceptance
   and exact-head merge requirements remain in DOCUMENTATION_POLICY.

Return a reviewable explanation and recommendation. Do not accept on the human's
behalf, fix code, resolve threads, merge, deploy, or change the board from this
explanation. Already-authorized separate delivery actions retain their scope.
