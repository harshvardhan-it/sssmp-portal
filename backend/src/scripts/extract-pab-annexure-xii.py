"""Extract Annexure XII from the official MP PAB PDF.

Requires Python 3 and pypdf (pip install pypdf). The input PDF may be the
official URL download or an official archived capture of that same document.
"""

import json
import re
import sys
from pathlib import Path

EXPECTED_COUNT = 263
SOURCE_URL = "https://dsel.education.gov.in/sites/default/files/2022-07/pab_mp_2223.pdf"
ROW = re.compile(r"^\s*\d+\s+(\d{4})\s+(.+?)\s+(\d{6})\s+(.+?)\s*$")


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: python extract-pab-annexure-xii.py <input.pdf> <output.json>")
    from pypdf import PdfReader

    text = "\n".join(page.extract_text() or "" for page in PdfReader(sys.argv[1]).pages)
    start = text.index("List of 263 Blocks for Resource Room Madhya Pradesh")
    end = text.index("Annexure XIII", start)
    records = []
    for line in text[start:end].splitlines():
        match = ROW.match(line)
        if match:
            records.append({
                "districtCode": match.group(1),
                "districtName": match.group(2).strip(),
                "blockCode": match.group(3),
                "blockName": match.group(4).strip(),
            })
    if len(records) != EXPECTED_COUNT:
        raise SystemExit(f"Expected {EXPECTED_COUNT} records, extracted {len(records)}")
    Path(sys.argv[2]).write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"sourceUrl": SOURCE_URL, "recordCount": len(records)}))


if __name__ == "__main__":
    main()
