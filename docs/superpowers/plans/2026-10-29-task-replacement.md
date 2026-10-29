# Task domain replacement implementation plan

Approved scope: preserve task URL A; mark A inactive; create a separate site B copying task credentials and title, flag Y, active, discovery/crawl timestamps at save; link task and findings to B. Add task URL search and non-blocking duplicate warnings by normalized type, bank and identifier. Show replacement on task and site views. An inactive task may be saved without a replacement when none is known. Reopening a replacement uses the existing linked B and never inserts another B implicitly.

1. Done: regression tests for replacement planning, duplicate normalization, input validation and search.
2. Done: focused validation/persistence service, relationship fields and route integration.
3. Done: user popup status/replacement, inline warnings and search; replacement/source labels on task/site lists.
4. Done: 25 tests pass with TASK_INTEGRATION_TESTS=1, including a separate temporary Mongo database removed after testing; JavaScript syntax checks and diff checks pass. Reviewer findings fixed: mixed-case legacy types and ordinary admin edits invalidating linked replacements. UI functions exercised in a simulated DOM; actual browser visual verification remains for the user.

Ruling after read-only topology check: local MongoDB is standalone. Use transactions on replica sets/mongos; on standalone, serialize this save flow and compensate completed writes on a caught failure. Compensation does not guarantee atomicity during a process crash or an unavailable database. Do not reconfigure the user's database.
