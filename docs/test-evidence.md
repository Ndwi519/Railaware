
> client@1.0.0 test
> vitest run --coverage


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.10 [39m[90mE:/Railaware/client[39m
      [2mCoverage enabled with [22m[33mv8[39m

[90mstdout[2m | src/__tests__/LiveMapPage.test.jsx[2m > [22m[2mLiveMapPage[2m > [22m[2mshows permission denied overlay if geolocation fails
[22m[39m[LiveMapPage] refreshObservation triggered for position: [1mnull[22m
[LiveMapPage] No position available. Aborting fetch.
Current observationData state: [1mnull[22m status: idle

[90mstderr[2m | src/__tests__/LiveMapPage.test.jsx[2m > [22m[2mLiveMapPage[2m > [22m[2mshows permission denied overlay if geolocation fails
[22m[39mGeolocation error: Error: Denied
    at Object.<anonymous> (E:/Railaware/client/src/__tests__/LiveMapPage.test.jsx:28:19)
    at Object.Mock [as watchPosition] [90m(file:///E:/Railaware/client/[39mnode_modules/[4m@vitest/spy[24m/dist/index.js:332:34[90m)[39m
    at E:/Railaware/client/src/pages/LiveMapPage.jsx:69:48
    at Object.react_stack_bottom_frame [90m(E:\Railaware\client\[39mnode_modules\[4mreact-dom[24m\cjs\react-dom-client.development.js:25989:20[90m)[39m
    at runWithFiberInDEV [90m(E:\Railaware\client\[39mnode_modules\[4mreact-dom[24m\cjs\react-dom-client.development.js:874:13[90m)[39m
    at commitHookEffectListMount [90m(E:\Railaware\client\[39mnode_modules\[4mreact-dom[24m\cjs\react-dom-client.development.js:13249:29[90m)[39m
    at commitHookPassiveMountEffects [90m(E:\Railaware\client\[39mnode_modules\[4mreact-dom[24m\cjs\react-dom-client.development.js:13336:11[90m)[39m
    at commitPassiveMountOnFiber [90m(E:\Railaware\client\[39mnode_modules\[4mreact-dom[24m\cjs\react-dom-client.development.js:15484:13[90m)[39m
    at recursivelyTraversePassiveMountEffects [90m(E:\Railaware\client\[39mnode_modules\[4mreact-dom[24m\cjs\react-dom-client.development.js:15439:11[90m)[39m
    at commitPassiveMountOnFiber [90m(E:\Railaware\client\[39mnode_modules\[4mreact-dom[24m\cjs\react-dom-client.development.js:15519:11[90m)[39m

[90mstdout[2m | src/__tests__/LiveMapPage.test.jsx[2m > [22m[2mLiveMapPage[2m > [22m[2mrenders observation data when fetch succeeds
[22m[39m[LiveMapPage] refreshObservation triggered for position: [1mnull[22m
[LiveMapPage] No position available. Aborting fetch.
Current observationData state: [1mnull[22m status: idle
[LiveMapPage] refreshObservation triggered for position: [ [33m10[39m, [33m20[39m ]
[LiveMapPage] Initializing AbortController and starting fetch
Current observationData state: [1mnull[22m status: loading

[90mstdout[2m | src/__tests__/LiveMapPage.test.jsx[2m > [22m[2mLiveMapPage[2m > [22m[2mrenders observation data when fetch succeeds
[22m[39mCurrent observationData state: {
  observation: { phase: [32m'observing'[39m },
  risk: {
    level: [32m'elevated'[39m,
    recommendedAction: [32m'Stay alert'[39m,
    explanation: [32m'Test'[39m
  },
  corridor: {
    resolutionStatus: [32m'RESOLVED'[39m,
    stationResolutionDetails: { status: [32m'RESOLVED'[39m, attempts: [36m[Array][39m }
  },
  trains: [ { id: [32m'1'[39m } ],
  metadata: { providerError: [1mnull[22m }
} status: success

[90mstdout[2m | src/__tests__/LiveMapPage.test.jsx[2m > [22m[2mLiveMapPage[2m > [22m[2mrenders UNRESOLVED topological gap state
[22m[39m[LiveMapPage] refreshObservation triggered for position: [1mnull[22m
[LiveMapPage] No position available. Aborting fetch.
Current observationData state: [1mnull[22m status: idle
[LiveMapPage] refreshObservation triggered for position: [ [33m10[39m, [33m20[39m ]
[LiveMapPage] Initializing AbortController and starting fetch
Current observationData state: [1mnull[22m status: loading

[90mstdout[2m | src/__tests__/LiveMapPage.test.jsx[2m > [22m[2mLiveMapPage[2m > [22m[2mrenders UNRESOLVED topological gap state
[22m[39mCurrent observationData state: {
  observation: {},
  risk: { level: [32m'low'[39m, recommendedAction: [32m'None'[39m, explanation: [32m'Gap'[39m },
  corridor: {
    resolutionStatus: [32m'UNRESOLVED'[39m,
    stationResolutionDetails: { status: [32m'UNRESOLVED'[39m }
  },
  trains: [],
  metadata: { providerError: [1mnull[22m }
} status: success

[90mstdout[2m | src/__tests__/DeveloperDiagnosticsPanel.test.jsx[2m > [22m[2mDeveloperDiagnosticsPanel[2m > [22m[2mvalidates coordinates on apply
[22m[39m[DiagnosticsPanel] dispatching new coordinates [ [33m26.9205[39m, [33m75.7876[39m ]

[90mstdout[2m | src/__tests__/LiveMapPage.test.jsx[2m > [22m[2mLiveMapPage[2m > [22m[2mhandles api error gracefully
[22m[39m[LiveMapPage] refreshObservation triggered for position: [1mnull[22m
[LiveMapPage] No position available. Aborting fetch.
Current observationData state: [1mnull[22m status: idle
[LiveMapPage] refreshObservation triggered for position: [ [33m10[39m, [33m20[39m ]
[LiveMapPage] Initializing AbortController and starting fetch
Current observationData state: [1mnull[22m status: loading

[90mstdout[2m | src/__tests__/DeveloperDiagnosticsPanel.test.jsx[2m > [22m[2mDeveloperDiagnosticsPanel[2m > [22m[2mallows duplicate consecutive requests to force a pipeline refresh
[22m[39m[DiagnosticsPanel] Identical coordinates applied. Triggering refresh via position update.
[DiagnosticsPanel] dispatching new coordinates [ [33m26[39m, [33m75[39m ]

[90mstdout[2m | src/__tests__/LiveMapPage.test.jsx[2m > [22m[2mLiveMapPage[2m > [22m[2mhandles api error gracefully
[22m[39mCurrent observationData state: [1mnull[22m status: error

[90mstdout[2m | src/__tests__/LiveMapPage.test.jsx[2m > [22m[2mLiveMapPage[2m > [22m[2mhandles simulation click
[22m[39m[LiveMapPage] refreshObservation triggered for position: [1mnull[22m
[LiveMapPage] No position available. Aborting fetch.
Current observationData state: [1mnull[22m status: idle
[LiveMapPage] refreshObservation triggered for position: [ [33m10[39m, [33m20[39m ]
[LiveMapPage] Initializing AbortController and starting fetch
Current observationData state: [1mnull[22m status: loading

[90mstdout[2m | src/__tests__/DeveloperDiagnosticsPanel.test.jsx[2m > [22m[2mDeveloperDiagnosticsPanel[2m > [22m[2msubmits on Enter key
[22m[39m[DiagnosticsPanel] dispatching new coordinates [ [33m15[39m, [33m30[39m ]

[90mstdout[2m | src/__tests__/LiveMapPage.test.jsx[2m > [22m[2mLiveMapPage[2m > [22m[2mhandles simulation click
[22m[39mCurrent observationData state: {
  observation: { phase: [32m'observing'[39m, trackPresence: [32m'no'[39m },
  risk: { level: [32m'low'[39m, recommendedAction: [32m'None'[39m }
} status: success

 [32m✓[39m src/__tests__/EmergencyMode.test.jsx [2m([22m[2m4 tests[22m[2m)[22m[32m 211[2mms[22m[39m
[90mstdout[2m | src/__tests__/LiveMapPage.test.jsx[2m > [22m[2mLiveMapPage[2m > [22m[2mhandles simulation click
[22m[39m[LiveMapPage] refreshObservation triggered for position: [ [33m12.34[39m, [33m56.78[39m ]
[LiveMapPage] Initializing AbortController and starting fetch
Current observationData state: {
  observation: { phase: [32m'observing'[39m, trackPresence: [32m'no'[39m },
  risk: { level: [32m'low'[39m, recommendedAction: [32m'None'[39m }
} status: loading

[90mstdout[2m | src/__tests__/LiveMapPage.test.jsx[2m > [22m[2mLiveMapPage[2m > [22m[2mhandles simulation click
[22m[39mCurrent observationData state: {
  observation: { phase: [32m'observing'[39m, trackPresence: [32m'no'[39m },
  risk: { level: [32m'low'[39m, recommendedAction: [32m'None'[39m }
} status: success

[90mstdout[2m | src/__tests__/LiveMapPage.test.jsx[2m > [22m[2mLiveMapPage[2m > [22m[2mdispatches fresh observation requests when identical coordinates are applied consecutively
[22m[39m[LiveMapPage] refreshObservation triggered for position: [1mnull[22m
[LiveMapPage] No position available. Aborting fetch.
Current observationData state: [1mnull[22m status: idle
[LiveMapPage] refreshObservation triggered for position: [ [33m10[39m, [33m20[39m ]
[LiveMapPage] Initializing AbortController and starting fetch
Current observationData state: [1mnull[22m status: loading

[90mstdout[2m | src/__tests__/LiveMapPage.test.jsx[2m > [22m[2mLiveMapPage[2m > [22m[2mdispatches fresh observation requests when identical coordinates are applied consecutively
[22m[39mCurrent observationData state: {
  observation: { phase: [32m'observing'[39m, trackPresence: [32m'no'[39m },
  risk: { level: [32m'low'[39m, recommendedAction: [32m'None'[39m }
} status: success

 [32m✓[39m src/__tests__/DeveloperDiagnosticsPanel.test.jsx [2m([22m[2m9 tests[22m[2m)[22m[32m 275[2mms[22m[39m
[90mstdout[2m | src/__tests__/LiveMapPage.test.jsx[2m > [22m[2mLiveMapPage[2m > [22m[2mdispatches fresh observation requests when identical coordinates are applied consecutively
[22m[39m[DiagnosticsPanel] dispatching new coordinates [ [33m12.34[39m, [33m56.78[39m ]

[90mstdout[2m | src/__tests__/LiveMapPage.test.jsx[2m > [22m[2mLiveMapPage[2m > [22m[2mdispatches fresh observation requests when identical coordinates are applied consecutively
[22m[39m[LiveMapPage] refreshObservation triggered for position: [ [33m12.34[39m, [33m56.78[39m ]
[LiveMapPage] Initializing AbortController and starting fetch
Current observationData state: {
  observation: { phase: [32m'observing'[39m, trackPresence: [32m'no'[39m },
  risk: { level: [32m'low'[39m, recommendedAction: [32m'None'[39m }
} status: loading

[90mstdout[2m | src/__tests__/LiveMapPage.test.jsx[2m > [22m[2mLiveMapPage[2m > [22m[2mdispatches fresh observation requests when identical coordinates are applied consecutively
[22m[39mCurrent observationData state: {
  observation: { phase: [32m'observing'[39m, trackPresence: [32m'no'[39m },
  risk: { level: [32m'low'[39m, recommendedAction: [32m'None'[39m }
} status: success

[90mstdout[2m | src/__tests__/LiveMapPage.test.jsx[2m > [22m[2mLiveMapPage[2m > [22m[2mdispatches fresh observation requests when identical coordinates are applied consecutively
[22m[39m[DiagnosticsPanel] Identical coordinates applied. Triggering refresh via position update.
[DiagnosticsPanel] dispatching new coordinates [ [33m12.34[39m, [33m56.78[39m ]

[90mstdout[2m | src/__tests__/LiveMapPage.test.jsx[2m > [22m[2mLiveMapPage[2m > [22m[2mdispatches fresh observation requests when identical coordinates are applied consecutively
[22m[39m[LiveMapPage] refreshObservation triggered for position: [ [33m12.34[39m, [33m56.78[39m ]
[LiveMapPage] Initializing AbortController and starting fetch
Current observationData state: {
  observation: { phase: [32m'observing'[39m, trackPresence: [32m'no'[39m },
  risk: { level: [32m'low'[39m, recommendedAction: [32m'None'[39m }
} status: loading

[90mstdout[2m | src/__tests__/LiveMapPage.test.jsx[2m > [22m[2mLiveMapPage[2m > [22m[2mdispatches fresh observation requests when identical coordinates are applied consecutively
[22m[39mCurrent observationData state: {
  observation: { phase: [32m'observing'[39m, trackPresence: [32m'no'[39m },
  risk: { level: [32m'low'[39m, recommendedAction: [32m'None'[39m }
} status: success

[90mstdout[2m | src/__tests__/LiveMapPage.test.jsx[2m > [22m[2mLiveMapPage[2m > [22m[2maborts ongoing requests if a new request is triggered
[22m[39m[LiveMapPage] refreshObservation triggered for position: [1mnull[22m
[LiveMapPage] No position available. Aborting fetch.
Current observationData state: [1mnull[22m status: idle
[LiveMapPage] refreshObservation triggered for position: [ [33m10[39m, [33m20[39m ]
[LiveMapPage] Initializing AbortController and starting fetch
Current observationData state: [1mnull[22m status: loading

[90mstdout[2m | src/__tests__/LiveMapPage.test.jsx[2m > [22m[2mLiveMapPage[2m > [22m[2maborts ongoing requests if a new request is triggered
[22m[39m[DiagnosticsPanel] dispatching new coordinates [ [33m12.34[39m, [33m56.78[39m ]

[90mstdout[2m | src/__tests__/LiveMapPage.test.jsx[2m > [22m[2mLiveMapPage[2m > [22m[2maborts ongoing requests if a new request is triggered
[22m[39m[LiveMapPage] refreshObservation triggered for position: [ [33m12.34[39m, [33m56.78[39m ]
[LiveMapPage] Initializing AbortController and starting fetch

[90mstdout[2m | src/__tests__/LiveMapPage.test.jsx[2m > [22m[2mLiveMapPage[2m > [22m[2maborts ongoing requests if a new request is triggered
[22m[39mCurrent observationData state: { observation: {}, risk: {} } status: success

 [32m✓[39m src/__tests__/LiveMapPage.test.jsx [2m([22m[2m7 tests[22m[2m)[22m[33m 463[2mms[22m[39m
[90mstdout[2m | src/__tests__/accessibility.test.jsx[2m > [22m[2mAccessibility Checks (axe-core)[2m > [22m[2mLiveMapPage loading state should have no a11y violations
[22m[39m[LiveMapPage] refreshObservation triggered for position: [1mnull[22m
[LiveMapPage] No position available. Aborting fetch.
Current observationData state: [1mnull[22m status: idle

Not implemented: HTMLCanvasElement's getContext() method: without installing the canvas npm package
[90mstdout[2m | src/__tests__/accessibility.test.jsx[2m > [22m[2mAccessibility Checks (axe-core)[2m > [22m[2mLiveMapPage denied state should have no a11y violations
[22m[39m[LiveMapPage] refreshObservation triggered for position: [1mnull[22m
[LiveMapPage] No position available. Aborting fetch.
Current observationData state: [1mnull[22m status: idle

[90mstderr[2m | src/__tests__/accessibility.test.jsx[2m > [22m[2mAccessibility Checks (axe-core)[2m > [22m[2mLiveMapPage denied state should have no a11y violations
[22m[39mGeolocation error: Error: Denied
    at Object.<anonymous> (E:/Railaware/client/src/__tests__/accessibility.test.jsx:32:19)
    at Object.Mock [as watchPosition] [90m(file:///E:/Railaware/client/[39mnode_modules/[4m@vitest/spy[24m/dist/index.js:332:34[90m)[39m
    at E:/Railaware/client/src/pages/LiveMapPage.jsx:69:48
    at Object.react_stack_bottom_frame [90m(E:\Railaware\client\[39mnode_modules\[4mreact-dom[24m\cjs\react-dom-client.development.js:25989:20[90m)[39m
    at runWithFiberInDEV [90m(E:\Railaware\client\[39mnode_modules\[4mreact-dom[24m\cjs\react-dom-client.development.js:874:13[90m)[39m
    at commitHookEffectListMount [90m(E:\Railaware\client\[39mnode_modules\[4mreact-dom[24m\cjs\react-dom-client.development.js:13249:29[90m)[39m
    at commitHookPassiveMountEffects [90m(E:\Railaware\client\[39mnode_modules\[4mreact-dom[24m\cjs\react-dom-client.development.js:13336:11[90m)[39m
    at commitPassiveMountOnFiber [90m(E:\Railaware\client\[39mnode_modules\[4mreact-dom[24m\cjs\react-dom-client.development.js:15484:13[90m)[39m
    at recursivelyTraversePassiveMountEffects [90m(E:\Railaware\client\[39mnode_modules\[4mreact-dom[24m\cjs\react-dom-client.development.js:15439:11[90m)[39m
    at commitPassiveMountOnFiber [90m(E:\Railaware\client\[39mnode_modules\[4mreact-dom[24m\cjs\react-dom-client.development.js:15519:11[90m)[39m

Not implemented: HTMLCanvasElement's getContext() method: without installing the canvas npm package
Not implemented: HTMLCanvasElement's getContext() method: without installing the canvas npm package
 [32m✓[39m src/__tests__/accessibility.test.jsx [2m([22m[2m4 tests[22m[2m)[22m[33m 371[2mms[22m[39m

<--- Last few GCs --->

[2560:00000163F0FE7000]   176622 ms: Scavenge (interleaved) 2041.2 (2046.2) -> 2039.5 (2050.2) MB, pooled: 0 MB, 16.71 / 0.00 ms  (average mu = 0.320, current mu = 0.271) allocation failure; 
[2560:00000163F0FE7000]   179397 ms: Mark-Compact (reduce) 2045.1 (2052.0) -> 2040.2 (2044.5) MB, pooled: 0 MB, 2001.61 / 0.00 ms  (+ 450.4 ms in 89 steps since start of marking, biggest step 5.9 ms, walltime since start of marking 2775 ms) (average mu = 
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
----- Native stack trace -----

 1: 00007FF763CCC36F node::OnFatalError+1343
 2: 00007FF764914D77 v8::Function::NewInstance+423
 3: 00007FF764715467 v8::base::AddressSpaceReservation::AddressSpaceReservation+322071
 4: 00007FF764719174 v8::base::AddressSpaceReservation::AddressSpaceReservation+337700
 5: 00007FF76472810C v8::internal::StrongRootAllocatorBase::deallocate_impl+16604
 6: 00007FF76472794B v8::internal::StrongRootAllocatorBase::deallocate_impl+14619
 7: 00007FF765BADAED v8::base::UnsignedDivisionByConstant<unsigned __int64>+2791421
 8: 00007FF764712F30 v8::base::AddressSpaceReservation::AddressSpaceReservation+312544
 9: 00007FF76472D7BA X509_STORE_set_cleanup+5098
10: 00007FF764739C56 uv_timer_set_repeat+20694
11: 00007FF76430CD47 v8::String::Utf8Value::~Utf8Value+143495
12: 00000163AFE7733A 
[31m⎯⎯⎯⎯⎯⎯[39m[1m[41m Unhandled Errors [49m[22m[31m⎯⎯⎯⎯⎯⎯[39m
[31m[1m
Vitest caught 1 unhandled error during the test run.
This might cause false positive tests. Resolve unhandled errors to make sure your tests are not affected.[22m[39m

[31m⎯⎯⎯⎯⎯⎯[39m[1m[41m Unhandled Error [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m
[31m[1mError[22m: [vitest-pool]: Worker forks emitted error.[39m
[90m [2m❯[22m EventEmitter.onTaskError node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:[2m3459:21[22m[39m
[90m [2m❯[22m EventEmitter.emit node:events:[2m508:28[22m[39m
[90m [2m❯[22m ChildProcess.emitUnexpectedExit node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:[2m3025:22[22m[39m
[90m [2m❯[22m ChildProcess.emit node:events:[2m508:28[22m[39m
[90m [2m❯[22m Process.ChildProcess._handle.onexit node:internal/child_process:[2m294:12[22m[39m

[31m[1mCaused by: Error[22m: Worker exited unexpectedly[39m
[90m [2m❯[22m ChildProcess.emitUnexpectedExit node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:[2m3023:33[22m[39m
[90m [2m❯[22m ChildProcess.emit node:events:[2m508:28[22m[39m
[90m [2m❯[22m Process.ChildProcess._handle.onexit node:internal/child_process:[2m294:12[22m[39m

[31m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[39m


[2m Test Files [22m [1m[32m4 passed[39m[22m[90m (5)[39m
[2m      Tests [22m [1m[32m24 passed[39m[22m[90m (28)[39m
[2m     Errors [22m [1m[31m1 error[39m[22m
[2m   Start at [22m 22:07:25
[2m   Duration [22m 180.24s[2m (transform 531ms, setup 1.09s, import 2.50s, tests 1.32s, environment 7.97s)[22m

[34m % [39m[2mCoverage report from [22m[33mv8[39m
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-------------------|---------|----------|---------|---------|-------------------
All files          |   88.95 |    88.38 |      85 |   89.34 |                   
 components        |   84.74 |    90.76 |   78.57 |   86.53 |                   
  ...ticsPanel.jsx |   82.35 |    89.09 |   76.92 |   84.78 | ...-37,88,129,146 
  ...gencyMode.jsx |     100 |      100 |     100 |     100 |                   
 hooks             |     100 |      100 |     100 |     100 |                   
  ...edLocation.js |     100 |      100 |     100 |     100 |                   
 pages             |      89 |    85.36 |   86.95 |   88.54 |                   
  LiveMapPage.jsx  |      89 |    85.36 |   86.95 |   88.54 | ...98,149-150,229 
-------------------|---------|----------|---------|---------|-------------------
