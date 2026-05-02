#!/usr/bin/env python3
"""
Fill in every blank Category column in SaintsFeasts.csv with "Immovable".
"""

import csv

rows = []
with open('SaintsFeasts.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    for row in reader:
        rows.append(row)

header = rows[0]
data_rows = rows[1:]

for row in data_rows:
    while len(row) < 6:
        row.append('')
    if not row[2].strip():
        row[2] = 'Immovable'

with open('SaintsFeasts.csv', 'w', encoding='utf-8', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(header)
    for row in data_rows:
        writer.writerow(row)

print("Done. Filled blank Category cells with 'Immovable'.")
