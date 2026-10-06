"""Check the guide's code examples.

* every Python block must parse (except ones marked as deliberate errors)
* every Python block followed by an OUTPUT box is run, and its real output
  must match the output printed in the guide
"""

import ast
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    with open(os.path.join(HERE, "build_blocks.json")) as f:
        data = json.load(f)

    problems = 0
    for src, bad in data["python_blocks"]:
        try:
            ast.parse(src)
            if bad:
                print("EXPECTED A SYNTAX/RUNTIME ERROR BLOCK TO FAIL, BUT IT PARSES (ok if runtime):",
                      src.splitlines()[0])
        except SyntaxError as e:
            if not bad:
                problems += 1
                print("SYNTAX ERROR in block:\n", src, "\n", e, "\n")

    for src, expected in data["python_tests"]:
        with tempfile.TemporaryDirectory() as tmp:
            result = subprocess.run(
                [sys.executable, "-I", "-c", src], cwd=tmp, capture_output=True, text=True,
                timeout=20,
            )
        got = [line.rstrip() for line in result.stdout.rstrip("\n").split("\n")]
        want = [line.rstrip() for line in expected.rstrip("\n").split("\n")]
        while got and got[-1] == "":
            got.pop()
        if got != want or result.returncode != 0:
            problems += 1
            print("MISMATCH\n--- code ---\n" + src + "\n--- expected ---\n" + expected +
                  "\n--- got ---\n" + result.stdout + result.stderr + "\n")

    print(f"checked {len(data['python_blocks'])} python blocks, "
          f"ran {len(data['python_tests'])} with expected output, problems: {problems}")
    return problems


if __name__ == "__main__":
    sys.exit(1 if main() else 0)
