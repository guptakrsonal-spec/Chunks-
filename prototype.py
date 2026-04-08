import os
import time
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import threading
import hashlib

class ChunkTransferApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Chunk-Based File Transfer System")
        self.root.geometry("600x500")
        self.root.configure(bg="#f0f0f0")

        # Configuration
        self.chunk_size = 1024  # 1 KB
        self.progress_file = "progress.txt"
        self.source_file = ""
        self.dest_file = ""
        self.is_paused = False
        self.is_running = False
        self.simulate_error = False
        self.start_time = 0
        self.transferred_bytes = 0

        self.setup_ui()

    def setup_ui(self):
        # Header
        header = tk.Label(self.root, text="Chunk-Based File Transfer System", font=("Helvetica", 16, "bold"), bg="#f0f0f0", fg="#333")
        header.pack(pady=20)

        # File Selection Frame
        file_frame = tk.Frame(self.root, bg="#f0f0f0")
        file_frame.pack(fill="x", padx=20)

        self.file_label = tk.Label(file_frame, text="No file selected", bg="#f0f0f0", font=("Helvetica", 10))
        self.file_label.pack(side="left")

        select_btn = tk.Button(file_frame, text="Select File", command=self.select_file, bg="#2196F3", fg="white", relief="flat", padx=10)
        select_btn.pack(side="right")

        # Details Frame
        self.details_frame = tk.LabelFrame(self.root, text="File Details", bg="#f0f0f0", font=("Helvetica", 10, "bold"))
        self.details_frame.pack(fill="x", padx=20, pady=10)

        self.details_label = tk.Label(self.details_frame, text="Name: -\nSize: -\nChunks: -", justify="left", bg="#f0f0f0")
        self.details_label.pack(padx=10, pady=5, anchor="w")

        # Progress Frame
        progress_frame = tk.Frame(self.root, bg="#f0f0f0")
        progress_frame.pack(fill="x", padx=20, pady=10)

        self.progress_bar = ttk.Progressbar(progress_frame, orient="horizontal", length=400, mode="determinate")
        self.progress_bar.pack(fill="x", pady=5)

        self.status_label = tk.Label(progress_frame, text="Status: Idle", bg="#f0f0f0", font=("Helvetica", 10))
        self.status_label.pack(side="left")

        self.percent_label = tk.Label(progress_frame, text="0%", bg="#f0f0f0", font=("Helvetica", 10, "bold"))
        self.percent_label.pack(side="right")

        # Speed and Stats
        self.stats_label = tk.Label(self.root, text="Speed: 0 KB/s | Transferred: 0/0 Chunks", bg="#f0f0f0")
        self.stats_label.pack(pady=5)

        # Controls Frame
        controls_frame = tk.Frame(self.root, bg="#f0f0f0")
        controls_frame.pack(pady=20)

        self.start_btn = tk.Button(controls_frame, text="Start Transfer", command=self.start_transfer, bg="#4CAF50", fg="white", width=12)
        self.start_btn.grid(row=0, column=0, padx=5)

        self.resume_btn = tk.Button(controls_frame, text="Resume", command=self.resume_transfer, bg="#FF9800", fg="white", width=12)
        self.resume_btn.grid(row=0, column=1, padx=5)

        self.pause_btn = tk.Button(controls_frame, text="Pause", command=self.toggle_pause, bg="#9E9E9E", fg="white", width=12)
        self.pause_btn.grid(row=0, column=2, padx=5)

        self.error_btn = tk.Button(controls_frame, text="Simulate Error", command=self.trigger_error, bg="#F44336", fg="white", width=12)
        self.error_btn.grid(row=0, column=3, padx=5)

    def select_file(self):
        self.source_file = filedialog.askopenfilename()
        if self.source_file:
            file_size = os.path.getsize(self.source_file)
            total_chunks = (file_size + self.chunk_size - 1) // self.chunk_size
            file_name = os.path.basename(self.source_file)
            
            self.file_label.config(text=file_name)
            self.details_label.config(text=f"Name: {file_name}\nSize: {file_size} bytes\nChunks: {total_chunks}")
            self.dest_file = "transferred_" + file_name
            
            # Reset UI
            self.progress_bar["value"] = 0
            self.percent_label.config(text="0%")
            self.status_label.config(text="Status: Ready")

    def toggle_pause(self):
        if not self.is_running: return
        self.is_paused = not self.is_paused
        if self.is_paused:
            self.pause_btn.config(text="Resume Logic", bg="#2196F3")
            self.status_label.config(text="Status: Paused")
        else:
            self.pause_btn.config(text="Pause", bg="#9E9E9E")
            self.status_label.config(text="Status: Running")

    def trigger_error(self):
        if self.is_running:
            self.simulate_error = True
            messagebox.showwarning("Error Simulation", "Network failure simulated! Transfer interrupted.")

    def start_transfer(self):
        if not self.source_file:
            messagebox.showerror("Error", "Please select a file first!")
            return
        
        # Clear previous progress
        if os.path.exists(self.progress_file):
            os.remove(self.progress_file)
        if os.path.exists(self.dest_file):
            os.remove(self.dest_file)
            
        self.run_transfer(0)

    def resume_transfer(self):
        if not self.source_file:
            messagebox.showerror("Error", "Please select a file first!")
            return
        
        if not os.path.exists(self.progress_file):
            messagebox.showinfo("Info", "No previous progress found. Starting fresh.")
            self.start_transfer()
            return
            
        with open(self.progress_file, "r") as f:
            last_chunk = int(f.read().strip())
        
        self.run_transfer(last_chunk)

    def run_transfer(self, start_chunk):
        if self.is_running: return
        
        self.is_running = True
        self.is_paused = False
        self.simulate_error = False
        self.start_time = time.time()
        self.transferred_bytes = start_chunk * self.chunk_size
        
        thread = threading.Thread(target=self.transfer_logic, args=(start_chunk,))
        thread.daemon = True
        thread.start()

    def transfer_logic(self, start_chunk):
        file_size = os.path.getsize(self.source_file)
        total_chunks = (file_size + self.chunk_size - 1) // self.chunk_size
        
        mode = "ab" if start_chunk > 0 else "wb"
        
        try:
            with open(self.source_file, "rb") as src, open(self.dest_file, mode) as dest:
                src.seek(start_chunk * self.chunk_size)
                
                for i in range(start_chunk, total_chunks):
                    while self.is_paused:
                        time.sleep(0.1)
                    
                    if self.simulate_error:
                        self.is_running = False
                        return

                    chunk = src.read(self.chunk_size)
                    if not chunk: break
                    
                    dest.write(chunk)
                    dest.flush()
                    
                    # Simulate transfer delay
                    time.sleep(0.05)
                    
                    # Update progress
                    current_chunk = i + 1
                    self.update_ui_progress(current_chunk, total_chunks, file_size)
                    
                    # Save progress
                    with open(self.progress_file, "w") as f:
                        f.write(str(current_chunk))

            self.is_running = False
            self.status_label.config(text="Status: Completed")
            self.verify_file()
            messagebox.showinfo("Success", "File transfer completed successfully!")
            
        except Exception as e:
            self.is_running = False
            messagebox.showerror("Error", f"Transfer failed: {str(e)}")

    def update_ui_progress(self, current, total, total_size):
        percent = (current / total) * 100
        self.progress_bar["value"] = percent
        self.percent_label.config(text=f"{int(percent)}%")
        
        elapsed = time.time() - self.start_time
        if elapsed > 0:
            speed = (current * self.chunk_size) / (elapsed * 1024) # KB/s
            self.stats_label.config(text=f"Speed: {speed:.2f} KB/s | Transferred: {current}/{total} Chunks")
        
        self.status_label.config(text="Status: Running")

    def verify_file(self):
        def get_hash(filename):
            h = hashlib.md5()
            with open(filename, 'rb') as f:
                while True:
                    data = f.read(8192)
                    if not data: break
                    h.update(data)
            return h.hexdigest()

        src_hash = get_hash(self.source_file)
        dest_hash = get_hash(self.dest_file)
        
        if src_hash == dest_hash:
            self.status_label.config(text="Status: Verified (OK)")
        else:
            self.status_label.config(text="Status: Verification Failed!")

if __name__ == "__main__":
    root = tk.Tk()
    app = ChunkTransferApp(root)
    root.mainloop()
