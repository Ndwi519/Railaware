# Raw Validation Evidence (Release Candidate v1.0.0)

## Scenario A & B (Valid Corridor & Null Island)

**Console Output:**
```
=== SCENARIO A: 26.9197, 75.7893 (Valid Corridor) ===
Request 1...
R1 Status: 200, Duration: 1482ms
Waiting 2s...
Request 2...
R2 Status: 200, Duration: 10ms

=== SCENARIO B: 0, 0 (Null Island) ===
Request 1...
R1 Status: 200, Duration: 1033ms
Waiting 2s...
Request 2...
R2 Status: 200, Duration: 8ms
```

**Server Logs:**
```json
{"timestamp":"2026-07-10T06:56:04.378Z","level":"info","module":"corridor-resolver","message":"No corridors found near location","context":{"location":{"lat":0,"lng":0},"radiusMetres":500}}
::1 - - [10/Jul/2026:06:56:04 +0000] "POST /api/v1/observation HTTP/1.1" 200 143 "-" "node"
{"timestamp":"2026-07-10T06:56:06.389Z","level":"info","module":"api:server","message":"Incoming observation request delegated to RailAwareService","context":{"location":{"lat":0,"lng":0}}}
{"timestamp":"2026-07-10T06:56:06.389Z","level":"info","module":"corridor-resolver:overpass","message":"CACHE HIT","context":{"requestId":"9a80de0b-a98b-4258-9db2-0a574778203c","cacheKey":"0.0000,0.0000,500"}}
{"timestamp":"2026-07-10T06:56:06.389Z","level":"info","module":"corridor-resolver","message":"No corridors found near location","context":{"location":{"lat":0,"lng":0},"radiusMetres":500}}
::1 - - [10/Jul/2026:06:56:06 +0000] "POST /api/v1/observation HTTP/1.1" 200 143 "-" "node"
```

## Scenario D (Request Coalescing)

**Console Output:**
```
=== SCENARIO D: 10 Concurrent Requests ===
Firing 10 concurrent requests to 28.6139, 77.2090...
R1 Status: 200, Duration: 885ms
R2 Status: 200, Duration: 885ms
R3 Status: 200, Duration: 884ms
R4 Status: 200, Duration: 885ms
R5 Status: 200, Duration: 884ms
R6 Status: 200, Duration: 885ms
R7 Status: 200, Duration: 885ms
R8 Status: 200, Duration: 884ms
R9 Status: 200, Duration: 884ms
R10 Status: 200, Duration: 885ms
```

**Server Logs:**
```json
{"timestamp":"2026-07-10T07:12:40.545Z","level":"info","module":"corridor-resolver:overpass","message":"CACHE MISS","context":{"requestId":"2f5a5631-d779-4245-b0a4-09930b81c48a","cacheKey":"28.6150,77.2100,500"}}
{"timestamp":"2026-07-10T07:12:40.573Z","level":"info","module":"corridor-resolver:overpass","message":"IN-FLIGHT COALESCING HIT","context":{"requestId":"8fe5289e-7c54-45ed-8045-3251ea55aa74","cacheKey":"28.6150,77.2100,500"}}
{"timestamp":"2026-07-10T07:12:40.574Z","level":"info","module":"corridor-resolver:overpass","message":"IN-FLIGHT COALESCING HIT","context":{"requestId":"8d0695e6-05da-4e9f-bd8e-5eca8dc69b0e","cacheKey":"28.6150,77.2100,500"}}
{"timestamp":"2026-07-10T07:12:40.575Z","level":"info","module":"corridor-resolver:overpass","message":"IN-FLIGHT COALESCING HIT","context":{"requestId":"0f827851-4dab-456a-ab78-3f961ae8b9c3","cacheKey":"28.6150,77.2100,500"}}
{"timestamp":"2026-07-10T07:12:40.575Z","level":"info","module":"corridor-resolver:overpass","message":"IN-FLIGHT COALESCING HIT","context":{"requestId":"7dc891d9-0ec5-4ef1-bcb4-a84a50fff2b9","cacheKey":"28.6150,77.2100,500"}}
{"timestamp":"2026-07-10T07:12:40.575Z","level":"info","module":"corridor-resolver:overpass","message":"IN-FLIGHT COALESCING HIT","context":{"requestId":"8b9e2fa7-08ee-4118-9796-010b5074793f","cacheKey":"28.6150,77.2100,500"}}
{"timestamp":"2026-07-10T07:12:40.576Z","level":"info","module":"corridor-resolver:overpass","message":"IN-FLIGHT COALESCING HIT","context":{"requestId":"c36ed6e4-5e0e-4d6f-bdd3-c27fa3fe16fa","cacheKey":"28.6150,77.2100,500"}}
{"timestamp":"2026-07-10T07:12:40.576Z","level":"info","module":"corridor-resolver:overpass","message":"IN-FLIGHT COALESCING HIT","context":{"requestId":"cc7a5385-3394-4224-a155-78b65ba1aef3","cacheKey":"28.6150,77.2100,500"}}
{"timestamp":"2026-07-10T07:12:40.577Z","level":"info","module":"corridor-resolver:overpass","message":"IN-FLIGHT COALESCING HIT","context":{"requestId":"c7bc81e0-09f6-4b55-b466-e1afb2923e0d","cacheKey":"28.6150,77.2100,500"}}
{"timestamp":"2026-07-10T07:12:40.577Z","level":"info","module":"corridor-resolver:overpass","message":"IN-FLIGHT COALESCING HIT","context":{"requestId":"26c5c7f9-cdb5-4014-9e82-44e3c9e7b0db","cacheKey":"28.6150,77.2100,500"}}
{"timestamp":"2026-07-10T07:12:42.048Z","level":"info","module":"corridor-resolver:overpass","message":"Overpass API request completed","context":{"requestId":"2f5a5631-d779-4245-b0a4-09930b81c48a","timestamp":"2026-07-10T07:12:42.047Z","url":"https://overpass-api.de/api/interpreter","rawQuery":"\n      [out:json][timeout:10];\n      (\n        way[\"railway\"=\"rail\"](around:500,28.6139,77.209);\n      );\n      out body;\n      >;\n      out skel qt;\n    ","attempt":1,"durationMs":1499,"status":200,"responseSize":287,"timeoutStatus":false}}
```


> [!NOTE]
> **Resolution of `requestId` discrepancy:** The initial discrepancy in `requestId` values between `CACHE MISS` and the final completion log in the previous report was a documentation copy-paste artifact. The initial report manually excerpted a snippet from an older console trace. The fresh logs above demonstrate that the primary request (`2f5a5631...`) maintains perfect internal consistency from the initial `CACHE MISS` through to `Overpass API request completed`.

### Coalescing Mathematical Verification
- **Incoming HTTP Requests:** 10
- **Overpass Fetches Started (Network Calls):** 1
- **Concurrent Callers attached to Shared Promise:** 9
- **Cache Reads (In-Flight Coalescing Hits):** 9
- **Cache Reads (Completed Cache Hits):** 0 (New location)
- **Cache Writes (Successful Response TTL 30m):** 1

**Reconciliation:** 1 Network Fetch + 9 Coalesced Waiters = 10 Total Synchronous Responses returned perfectly identically.

## Scenario C (Failure Caching and Thundering Herd Mitigation)

**Console Output:**
```
=== SCENARIO C: Force Overpass unavailable ===
Request 1 (Expect MISS -> Retries -> FAILURE MISS cache written)...
R1 Status: 200, Duration: 3989ms
Waiting 2s...
Request 2 (Expect CACHE FAILURE HIT, extremely fast)...
R2 Status: 200, Duration: 9ms
```

**Server Logs:**
```json
{"timestamp":"2026-07-10T06:56:10.323Z","level":"info","module":"api:server","message":"Incoming observation request delegated to RailAwareService","context":{"location":{"lat":10,"lng":10}}}
{"timestamp":"2026-07-10T06:56:10.324Z","level":"info","module":"corridor-resolver:overpass","message":"CACHE MISS","context":{"requestId":"2e47e248-0388-437f-adfd-6aa7bb64404c","cacheKey":"10.0000,10.0000,500"}}
{"timestamp":"2026-07-10T06:56:10.616Z","level":"error","module":"corridor-resolver:overpass","message":"Overpass API request failed"}
{"timestamp":"2026-07-10T06:56:10.616Z","level":"info","module":"corridor-resolver:overpass","message":"Transient failure detected, retrying in 573ms... (Attempt 2/4)","context":{"requestId":"2e47e248-0388-437f-adfd-6aa7bb64404c"}}
{"timestamp":"2026-07-10T06:56:11.202Z","level":"error","module":"corridor-resolver:overpass","message":"Overpass API request failed"}
{"timestamp":"2026-07-10T06:56:11.202Z","level":"info","module":"corridor-resolver:overpass","message":"Transient failure detected, retrying in 1033ms... (Attempt 3/4)","context":{"requestId":"2e47e248-0388-437f-adfd-6aa7bb64404c"}}
{"timestamp":"2026-07-10T06:56:12.244Z","level":"error","module":"corridor-resolver:overpass","message":"Overpass API request failed"}
{"timestamp":"2026-07-10T06:56:12.245Z","level":"info","module":"corridor-resolver:overpass","message":"Transient failure detected, retrying in 2022ms... (Attempt 4/4)","context":{"requestId":"2e47e248-0388-437f-adfd-6aa7bb64404c"}}
{"timestamp":"2026-07-10T06:56:14.281Z","level":"error","module":"corridor-resolver:overpass","message":"Overpass API request failed"}
{"timestamp":"2026-07-10T06:56:14.282Z","level":"info","module":"corridor-resolver:overpass","message":"CACHE FAILURE MISS - Caching transient error","context":{"requestId":"2e47e248-0388-437f-adfd-6aa7bb64404c","cacheKey":"10.0000,10.0000,500"}}
::1 - - [10/Jul/2026:06:56:14 +0000] "POST /api/v1/observation HTTP/1.1" 200 207 "-" "node"
{"timestamp":"2026-07-10T06:56:16.299Z","level":"info","module":"api:server","message":"Incoming observation request delegated to RailAwareService","context":{"location":{"lat":10,"lng":10}}}
{"timestamp":"2026-07-10T06:56:16.299Z","level":"info","module":"corridor-resolver:overpass","message":"CACHE FAILURE HIT","context":{"requestId":"5001ef01-8646-4eff-a104-18208efd49af","cacheKey":"10.0000,10.0000,500"}}
```
