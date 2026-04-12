#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

base_dir = Path(__file__).resolve().parent
script = base_dir / "scripts" / "script.sh"
raise SystemExit(subprocess.call(["bash", str(script), *sys.argv[1:]]))
