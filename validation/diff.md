# Validation Diff: Generated 2026 vs Printed Calendar Images

Comparison of generated `dist/2026.json` against the 12 monthly calendar images in `validation/`.

## Summary

Overall the generated data matches the printed calendar very closely. The differences found are minor and fall into a few categories: one tone discrepancy (likely an error in the printed calendar), one data classification issue, and the known Pentecostarion fasting difference.

## Differences

### January

| Date | Field | Generated | Image | Assessment |
|------|-------|-----------|-------|------------|
| Jan 4 | Tone | Plagal 1st Tone | Plagal 2nd Tone | **Image likely wrong.** Our calculation matches the reference JSON and correct tone cycle math (36 Sundays from prev PASCHA+14 at index 1 = index 4 = Plagal 1st). |
| Jan 30 | Text type | `saint: "Three Hierarchs"` | Displayed as feast (bold) | **Data classification issue.** The CSV has "Three Hierarchs" as Type=Saint. The printed calendar treats it visually as a feast. Could update CSV to Type=Feast if desired. |

### February

No differences found. Tones, feasts, fasting, and notes all match.

### March

No differences found. DST note on Mar 8 correct. Annunciation (Mar 25) correct. All Lent Sundays correct.

### April

| Date | Field | Generated | Image | Assessment |
|------|-------|-----------|-------|------------|
| Apr 22, 24, 29 | Fasting | OIL | STRICT (with monastery note) | **Known discrepancy.** Our rules say OIL for Pentecostarion Wed/Fri. Image follows stricter monastic tradition. The monastery note on these same dates confirms OIL is the standard. |

### May

| Date | Field | Generated | Image | Assessment |
|------|-------|-----------|-------|------------|
| May 1, 13, 15, 22, 27, 29 | Fasting | OIL | STRICT (with monastery note) | **Same Pentecostarion discrepancy as April.** |

### June

| Date | Field | Generated | Image | Assessment |
|------|-------|-----------|-------|------------|
| Jun 7 | Tone | Plagal 4th Tone | Plagal 4th Tone | Match ✓ |
| Jun 28 | Feast | 4th Sunday of Matthew | 4th Sunday of Matthew | Match ✓ |

No differences found.

### July

| Date | Field | Generated | Image | Assessment |
|------|-------|-----------|-------|------------|
| Jul 19 | Feast | "Holy Fathers of 4th Ecumenical Council" (only) | Shows same | Match ✓. ECUM4 correctly overrides "7th Sunday of Matthew". |

No differences found.

### August

No differences found. Transfiguration (Aug 6) = FISH correct. Dormition (Aug 15) correct.

### September

No differences found. Elevation (Sep 14) correct. Sunday before/after Elevation correct.

### October

No differences found. Holy Fathers of 7th Ecumenical Council (Oct 11) correct. Luke Sundays correct.

### November

No differences found. Entry into Temple (Nov 21) correct. DST end (Nov 1) correct.

### December

| Date | Field | Generated | Image | Assessment |
|------|-------|-----------|-------|------------|
| Dec 27 | Feast | "Sunday after Nativity" | Shows same | Match ✓ |
| Dec 31 | Note | No-fasting note (Wed) | Shows `*` indicator | Match ✓ |

No differences found.

## Moon Phases

All verified moon phases match the printed calendar:
- January: Full (3), Last (10), New (18), First (25) ✓
- September: visible phases match ✓

## Readings

Readings in the generated output match the printed calendar where legible. The printed calendar shows abbreviated book names (e.g., "Mt." vs our "Matthew") which is expected — the readings formatter handles abbreviation at display time.

## Fixes Applied During Validation

1. **SUNbT/SATbT resolution bug** — These references (Sunday/Saturday before Theophany) were resolving to the NEXT year instead of the current year. Fixed by using `year-1` as the start year for the cross-year Dec 30 → Jan 5 window.

2. **resolveDateForYear boundary** — The SUNaT boundary was incorrectly rejecting non-PASCHA references (like SUNbT) that legitimately land before SUNaT. Fixed by only applying the boundary check to PASCHA references.

## Conclusion

After the two bug fixes above, the only remaining differences between generated output and the printed calendar are:

1. **Jan 4 tone** (Plagal 1st vs Plagal 2nd) — our math is correct; printed calendar appears wrong
2. **"Three Hierarchs" classification** — data categorization choice (Saint vs Feast)
3. **Pentecostarion Wed/Fri fasting** (OIL vs STRICT) — follows standard rules, not monastic tradition
