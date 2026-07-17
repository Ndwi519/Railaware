# Project Findings (12 July 2026)

## Threshold Calibration

The geometric station matching threshold was increased from **100 m** to **175 m**.

Reason:

- Runtime measurement at New Delhi Railway Station (NDLS)
- Mainline station projected 146.68 m from selected corridor
- Metro stations projected 266 m and 286 m
- 175 m accepts the real railway station while rejecting metro stations.

---

## Scenario 1

Location:

26.84056, 75.56345

Result:

- No railway corridor found
- No stations found

Expected behaviour.

---

## Scenario 2

Location:

28.6436, 77.2194 (NDLS)

Result:

- Corridor found
- One station matched (NDLS)
- Geometric Projection failed

Reason:

Insufficient valid stations to establish corridor bounds.

Investigation showed the resolver currently selects a single OSM way.
At NDLS the selected way is only about 600 m long and therefore cannot contain two bounding stations.

This is an architectural limitation rather than a defect in station matching.

---

## Scenario 3

Location:

28.6692, 77.2830

Result:

- Corridor found
- No station nodes returned by Overpass

Expected behaviour because no railway station nodes exist inside the configured search radius.

---

## Future Improvements

- Merge connected railway ways into one logical corridor before station matching.
- Consider an independent search strategy for station discovery rather than using the corridor search radius.