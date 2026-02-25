from pathlib import Path
import json
from rich import print

file_path = Path("/home/roshan-yadav/Desktop/TheOneEye/backend/bin/FileWritter/LinkedInProspectActivites.jsonl")
file_path2 = Path("/home/roshan-yadav/Desktop/TheOneEye/test.json")

with open(file_path, "r") as file:
    record1 = json.loads(file.readline())

out_path = Path(__file__).parent / "test.json"
# with open(out_path, "w") as file:
#     file.write(json.dumps(record1))

print(record1)