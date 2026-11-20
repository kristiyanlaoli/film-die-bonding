# Engineering model notes — film adhesive

Basis: project diagram `Film-type adhesive die bonding Mechanisme.png` and slide 16/18 of `T1503407_張明德_Die_Bonding_Equipment.pptx`. The source describes preformed DAF, controlled BLT, and stacked-die applications. Alignment, thermal cure and inspection are added educational stages. Actual material routes vary.

- Bonding pressure proxy = force in N / die area in mm² (MPa).
- BLT = initial film thickness × (1 − estimated compression / 100).
- Contact and void estimates respond to lamination pressure and temperature, attach temperature, force/area, dwell and contamination severity.
- Die damage proxy depends on force/area and silicon thickness. Tilt responds to contamination and lamination deficiency. The cure fraction uses a simplified thermal/time relationship.
- PASS requires estimated contact ≥95%, voids ≤4.5%, placement error ≤50 µm, tilt ≤0.17°, compression ≤20%, damage risk not High, and cure fraction ≥95%. These are illustrative thresholds, not acceptance standards.
- Time scaling, die and film heights, pin movement and void shapes are schematic. Cross-section shows illustrative void markers, not measured void geometry. Dicing tape remains separate from DAF. No full-wafer yield, die cracking mechanics or thermochemical kinetics is modeled.
- Six scenarios: nominal, poor lamination, excessive bonding force, misalignment, contamination and incomplete cure.
