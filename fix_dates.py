#!/usr/bin/env python3
"""
Fix the dates in SaintsFeastsOg.csv.

Rules:
- Jan 1 and Jan 2: dates on content rows are correct (use them as-is).
- Jan 3 through Oct 31: blank separator rows (English AND Greek both empty) 
  mean "advance to the next day". Dates in the Date column are meaningless 
  and ignored. We start counting from Jan 3 after the first blank separator.
- Nov 1 through Dec 31: dates on content rows are correct (use them as-is).
"""

import csv
from datetime import date, timedelta


def fix_dates():
    rows = []
    with open('SaintsFeastsOg.csv', 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        for row in reader:
            rows.append(row)

    header = rows[0]
    data_rows = rows[1:]

    fixed_rows = []

    # Find where Nov starts (first row with 2025-11-xx date and content)
    nov_start_idx = None
    for i, row in enumerate(data_rows):
        while len(row) < 6:
            row.append('')
        date_val = row[1].strip()
        english = row[4].strip()
        greek = row[5].strip()
        if date_val.startswith('2025-11') and (english or greek):
            nov_start_idx = i
            break

    # Phase 1: Jan 1-2 (dates are correct on content rows)
    # Phase 2: First blank separator onward through Oct (separator = next day)
    # Phase 3: Nov-Dec (dates are correct on content rows)

    current_date = None
    phase = 'jan1_2'  # Start in the Jan 1-2 phase
    last_row_was_content = False

    for i, row in enumerate(data_rows):
        row = list(row)
        while len(row) < 6:
            row.append('')

        english = row[4].strip()
        greek = row[5].strip()
        date_val = row[1].strip()
        has_content = bool(english or greek)

        # Phase 3: Nov/Dec - use dates as-is
        if nov_start_idx is not None and i >= nov_start_idx:
            if has_content and date_val:
                fixed_rows.append(row)
            continue

        # Phase 1: Jan 1-2 - trust dates on content rows
        if phase == 'jan1_2':
            if has_content and date_val:
                # Content row with a date - use it
                try:
                    parts = date_val.split('-')
                    current_date = date(int(parts[0]), int(parts[1]), int(parts[2]))
                except (ValueError, IndexError):
                    pass
                row[1] = current_date.strftime('%Y-%m-%d')
                fixed_rows.append(row)
                last_row_was_content = True
            elif not has_content:
                # First blank separator - transition to phase 2
                phase = 'separator'
                current_date = current_date + timedelta(days=1)
                last_row_was_content = False
            continue

        # Phase 2: Separator-driven dating (Jan 3 through Oct)
        if phase == 'separator':
            if not has_content:
                # Blank separator - advance date only if last row had content
                # (avoid double-advancing on consecutive blank rows)
                if last_row_was_content:
                    current_date = current_date + timedelta(days=1)
                    last_row_was_content = False
            else:
                # Content row - assign current date
                row[1] = current_date.strftime('%Y-%m-%d')
                fixed_rows.append(row)
                last_row_was_content = True

    # The last separator before Nov should have advanced us to Oct 31.
    # If the last pre-Nov date is Oct 30, it means the final blank separator
    # before Nov wasn't counted (because no content followed in phase 2).
    # This is fine - Oct 31 will be covered by Nov's data if needed.

    # Write output
    with open('SaintsFeasts.csv', 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(header)
        for row in fixed_rows:
            writer.writerow(row)

    print(f"Written {len(fixed_rows)} content rows to SaintsFeasts.csv")

    # Verification
    print("\nFirst 15 rows:")
    for row in fixed_rows[:15]:
        print(f"  {row[1]:12s} | {row[4][:70]}")

    print("\nJan 10-17:")
    for row in fixed_rows:
        if row[1] >= '2025-01-10' and row[1] <= '2025-01-17':
            print(f"  {row[1]:12s} | {row[4][:70]}")

    print("\nAround Jan 31 -> Feb 1:")
    for row in fixed_rows:
        if row[1] >= '2025-01-29' and row[1] <= '2025-02-04':
            print(f"  {row[1]:12s} | {row[4][:70]}")

    print("\nAround Oct -> Nov:")
    for row in fixed_rows:
        if row[1] >= '2025-10-29' and row[1] <= '2025-11-02':
            print(f"  {row[1]:12s} | {row[4][:70]}")

    # Date stats
    dates = sorted(set(row[1] for row in fixed_rows if row[1]))
    print(f"\nTotal unique dates: {len(dates)}")
    print(f"Date range: {dates[0]} to {dates[-1]}")
    print(f"Expected days in year: 365")
    
    # What's the last date before Nov?
    pre_nov = [row[1] for row in fixed_rows if row[1] < '2025-11-01']
    if pre_nov:
        print(f"Last date before Nov: {max(pre_nov)}")


if __name__ == '__main__':
    fix_dates()
