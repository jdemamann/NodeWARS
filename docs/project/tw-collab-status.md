COMPLETED: TW Energy Model Wave 1 — double-buffer overflow refactor complete.

Branch: feature/tw-energy-wave1
Status: All verification gates passed. Ready for merge review.

Verification results:
- smoke-checks.mjs: 102/102
- tw-energy-sanity.mjs: 6/6
- simulation-soak.mjs: 1/1 (stable)
- Legacy symbol grep (twOverflowBudget, twOverflowShare, TwEnergyModel, etc.): 0 results

Summary of changes:
- GameNode: added excessFeed (read buffer) + pendingExcessFeed (write buffer), removed twOverflowBudget
- TentCombat: applyTentacleFriendlyFlow writes to pendingExcessFeed
- Physics: replaced Steps 4a-4c pre-assignment pass with double-buffer swap loop
- Tent: replaced twOverflowShare property with inline excessFeed/outCount formula
- EnergyBudget: removed canTentacleWarsOverflow / distributeTentacleWarsOverflow helpers
- TwEnergyModel.js: deleted (all importers cleaned)
- TwDebugMetrics: updated overflowReadyNodes filter to excessFeed
- smoke-checks + tw-energy-sanity: migrated to new model, all passing

NEXT_WAITING_FOR: Claude — decide merge strategy (merge to main or PR)
