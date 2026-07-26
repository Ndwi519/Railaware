# Terminology Audit Exceptions

This document registers the intentional exceptions retained during the Phase 3 terminology audit where generic or context-specific usages of the word "safety" were preserved.

1. **`server/assistance-engine/RailAwareAssistanceEngine.js:5`**
   - **Wording**: "*@responsibility Consumer of the awareness state that deterministically generates safety guidance and emergency contact actions.*"
   - **Reason Retained**: This is active architectural guidance for this module's singular responsibility. The `AssistanceEngine` is the specific component responsible for generating actionable *safety guidance* for users during emergencies (e.g. crossing warnings). This is an accurate domain term for this specific subsystem.

2. **`server/observation-store/InMemoryObservationStore.test.js:70`**
   - **Wording**: "*// The store retains its own guard as a secondary safety net for objects that...*"
   - **Reason Retained**: This is a generic programming idiom describing an error boundary or defensive programming check. It is completely unrelated to railway safety guarantees and thus does not violate the terminology scope framing outlined in ADR 0005.

*(Note: The previously flagged phrase "absence of evidence is not evidence of safety" was successfully refactored in `RailAwareService.js` to "absence of evidence does not imply an all-clear state" to strictly align with ADR 0005).*
