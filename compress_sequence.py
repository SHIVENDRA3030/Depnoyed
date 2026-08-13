import os
from PIL import Image
from concurrent.futures import ThreadPoolExecutor
import time

seq_dir = "public/sequence"
out_dir = "public/sequence_webp"

os.makedirs(out_dir, exist_ok=True)

def process_frame(i):
    filename = f"frame_{str(i).zfill(3)}.jpg"
    in_path = os.path.join(seq_dir, filename)
    out_filename = f"frame_{str(i).zfill(3)}.webp"
    out_path = os.path.join(out_dir, out_filename)
    
    if os.path.exists(in_path) and not os.path.exists(out_path):
        try:
            with Image.open(in_path) as img:
                # Resize if larger than 1920px width to save space, keeping aspect ratio
                img.thumbnail((1920, 1920), Image.Resampling.LANCZOS)
                # Save as highly compressed WebP
                img.save(out_path, "WEBP", quality=75, method=4)
        except Exception as e:
            print(f"Error processing {filename}: {e}")

print("Starting WebP compression for 500 frames. This might take a minute...")
start_time = time.time()

# Process in parallel to speed it up
with ThreadPoolExecutor(max_workers=10) as executor:
    executor.map(process_frame, range(1, 501))

print(f"Compression complete in {time.time() - start_time:.2f} seconds!")
print(f"Images saved to {out_dir}")
