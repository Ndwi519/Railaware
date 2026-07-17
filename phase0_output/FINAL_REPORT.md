# Phase 0 Empirical Validation Report

## 1. Scope
- **Authenticated Endpoint Used**: `https://api.railradar.in`
- **Number of Authenticated Runs**: 2 
- **Moving Trains Observed**: 19665 (Run 1) and 12903 (Run 2)
- **Stationary Validation Outcome**: INSUFFICIENT DATA (In both runs, none of the pre-configured stationary candidates satisfied the strict `status` and `segmentProgress` topological requirements at the time of execution).
- **Rate-Limiting Encountered**: Run 2 encountered aggressive API rate-limiting (HTTP 429 "Too Many Requests"), causing `axios-retry` backoffs and suppressing 16 of the 20 planned polls.
- **Evidence Package Produced**: Raw JSON payloads, parser traces, cache logs, SHA-256 checksums, and execution manifests for both runs, archived locally in `phase0_evidence.zip`.

## 2. Direct Observations (Evidence Only)
- `segmentProgress` regressed (decreased) multiple times while the train remained on the exact same segment. *(Citation: `moving_extracted_data.json` for Run 1 & Run 2, `poll_moving_X.json`)*
- Parser ambiguity was completely absent; exactly one topological object matched the parsing schema in every response. *(Citation: `parser_trace_moving.txt`)*
- Cache headers (`Cache-Control: no-cache` and uniquely advancing `Trace-ID`) indicated fresh responses for every successful request. *(Citation: `cache_log_moving.txt`)*
- `status` remained strictly `"running"` during all observed regressions, with no transition to a stationary state. *(Citation: `poll_moving_X.json`)*
- Downstream ETA fields (`delayArrival`, `delayDeparture` on future `route` array nodes) increased exactly during every `segmentProgress` regression. *(Citation: Diff analysis of `poll_moving_4.json` vs `poll_moving_5.json` on Run 2, and corresponding polls on Run 1)*
- Root `delayMinutes` sometimes remained completely unchanged even when downstream ETAs increased. *(Citation: Run 1 Poll 10→11 and Run 2 Poll 4→5 JSON diffs)*
- HTTP 429 Too Many Requests errors occurred aggressively during Run 2, rejecting 75-second polling intervals. *(Citation: Command execution logs and Run 2 `cache_log_moving.txt`)*

## 3. Correlations
Across the authenticated datasets collected, every observed regression in `segmentProgress` coincided exactly with downstream ETA revisions.

- **Number of Regressions Observed:** 5 (4 in Run 1, 1 in Run 2)
- **Number of Matching Cases:** 5/5
- **Counterexamples Observed:** 0 (No regressions occurred without ETA changes; no ETA changes occurred without progress mutations)
- **Missing Observations:** 16 polls during Run 2 were suppressed due to HTTP 429 rate limiting, limiting the continuous dataset.

## 4. Unknowns
This investigation cannot determine:
- How RailRadar internally computes `segmentProgress`.
- Whether physical GPS hardware coordinates are ingested in real-time.
- Whether time-based interpolation is mathematically synthesized between physical track sensors.
- Whether ETA delays algorithmically drive the `segmentProgress` recalculation, or if a physical sensor update drives both simultaneously.
- Whether `segmentProgress` regressions can ever occur *without* a downstream ETA revision (the sample size is too small to prove absolute impossibility).

## 5. Hypotheses

**Hypothesis A: Interpolation Recalculation**
One possible explanation is that the provider may synthesize `segmentProgress` mathematically by dividing the elapsed time by the predicted ETA for the segment. When the ETA is pushed further into the future, the denominator increases, artificially pulling the progress percentage backward.
- **Evidence Supporting:** Perfect 5/5 correlation between ETA revisions and regressions.
- **Evidence Against:** None directly in the dataset.
- **Confidence Level:** Moderate.
- **Additional Evidence Required:** A massive long-term dataset analyzing whether the exact magnitude of the regression is always mathematically proportional to the ETA delta.

**Hypothesis B: Sensor Fusion Realignment**
The provider receives a delayed ping from physical track hardware indicating the train is further behind schedule than estimated, forcing both an ETA delay and a geographic rollback to match physical reality.
- **Evidence Supporting:** Occurs randomly mid-segment, typical of sparse sensor updates.
- **Evidence Against:** ETA delays manifest as exact integer minutes (+1m, +2m), which implies an algorithmic buffer rather than precise physical sensor reporting.
- **Confidence Level:** Low-Medium.
- **Additional Evidence Required:** Access to internal provider architecture documentation.

## 6. Methodological Limitations
- **Stationary Experiment Produced Insufficient Data:** Strict topological and status validation criteria prevented the selection of a stationary train during both active windows.
- **Rate Limiting:** Run 2 suffered severe HTTP 429 rate limiting, preventing continuous observation.
- **Limited Sample Size:** 24 total successful authenticated polls across two independent trains.
- **Provider internals were not observable.** Observations are derived exclusively from authenticated API responses. Internal computation, GPS ingestion, interpolation algorithms, backend processing, and internal decision logic could not be verified.

## 7. Conclusions
- Observed `segmentProgress` values were not monotonic during the authenticated observations.
- In the authenticated datasets collected, every observed `segmentProgress` regression coincided with downstream ETA revisions.
- High-frequency continuous polling is aggressively blocked by the `api.railradar.in` endpoint.

### Key Findings
- **[PROVEN]** `segmentProgress` can regress while a train remains on the same segment and retains a `"running"` status.
- **[PROVEN]** Parser ambiguity and HTTP proxy caching are not the cause of these regressions.
- **[PROVEN]** The root `delayMinutes` field often fails to sync with localized route ETA delays.
- **[PROVEN]** The authenticated provider explicitly enforces HTTP 429 limits against 75-second polling.
- **[CORRELATION]** 100% of observed regressions coincided directly with an ETA route adjustment.
- **[UNRESOLVED]** Whether regressions can occur completely independently of ETA adjustments.
- **[UNRESOLVED]** The underlying internal computation (GPS vs Algorithmic Interpolation) driving `segmentProgress`.
- **[UNRESOLVED]** Empirical stationary train behaviour, due to validation exclusions preventing data collection.

## Confidence Assessment

| Finding | Confidence |
|----------|------------|
| Authentication integrity | High |
| Parser correctness | High |
| Cache exclusion | High |
| Observation that `segmentProgress` can regress | High |
| Observation that regressions coincided with downstream ETA revisions in the collected datasets | Moderate–High |
| Provider implementation mechanism | Low |
| Stationary-train behaviour | Low (insufficient data) |
