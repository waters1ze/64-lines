import requests
import zstandard as zstd
import csv
import json
import sys

URL = 'https://database.lichess.org/lichess_db_puzzle.csv.zst'
OUTPUT_FILE = 'new-puzzles.json'

target_2200 = 4000
target_1400_2000 = 5000

collected = []
count_2200 = 0
count_1400_2000 = 0

print("Connecting to Lichess database...")

with requests.get(URL, stream=True) as response:
    response.raise_for_status()
    
    dctx = zstd.ZstdDecompressor()
    
    with dctx.stream_reader(response.raw) as reader:
        # Read lines one by one manually
        leftover = b""
        chunk_size = 65536
        
        while True:
            chunk = reader.read(chunk_size)
            if not chunk:
                break
                
            lines = (leftover + chunk).split(b'\n')
            leftover = lines.pop()
            
            for line in lines:
                try:
                    text_line = line.decode('utf-8').strip()
                except UnicodeDecodeError:
                    continue
                    
                if not text_line or text_line.startswith('PuzzleId'):
                    continue
                    
                parts = text_line.split(',')
                if len(parts) < 8:
                    continue
                    
                try:
                    rating = int(parts[3])
                except ValueError:
                    continue
                
                # Check ranges
                add = False
                if rating >= 2200 and count_2200 < target_2200:
                    count_2200 += 1
                    add = True
                elif 1400 <= rating <= 2000 and count_1400_2000 < target_1400_2000:
                    count_1400_2000 += 1
                    add = True
                    
                if add:
                    puzzle = {
                        "id": parts[0],
                        "fen": parts[1],
                        "moves": parts[2],
                        "rating": rating,
                        "ratingDeviation": int(parts[4]) if parts[4].isdigit() else 0,
                        "themes": parts[7],
                        "openingTags": parts[9] if len(parts) > 9 else ""
                    }
                    collected.append(puzzle)
                
                if count_2200 >= target_2200 and count_1400_2000 >= target_1400_2000:
                    break
                    
            if count_2200 >= target_2200 and count_1400_2000 >= target_1400_2000:
                print("Reached target puzzle counts.")
                break

print(f"Finished parsing. Collected {count_2200} puzzles of 2200+, and {count_1400_2000} of 1400-2000.")
print(f"Writing to {OUTPUT_FILE}...")
with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(collected, f)
print("Done!")
