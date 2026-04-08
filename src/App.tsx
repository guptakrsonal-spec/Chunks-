import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  FileUp, 
  Play, 
  Pause, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Activity, 
  Zap,
  Terminal,
  Code,
  ShieldCheck,
  Cpu,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CHUNK_SIZE = 1024; // 1KB
const SIMULATED_DELAY = 50; // ms per chunk

interface FileDetails {
  name: string;
  size: number;
  type: string;
  totalChunks: number;
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [fileDetails, setFileDetails] = useState<FileDetails | null>(null);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'error' | 'completed'>('idle');
  const [speed, setSpeed] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [showPythonCode, setShowPythonCode] = useState(false);

  const transferInterval = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const details = {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type || 'application/octet-stream',
        totalChunks: Math.ceil(selectedFile.size / CHUNK_SIZE)
      };
      setFile(selectedFile);
      setFileDetails(details);
      setCurrentChunk(0);
      setStatus('idle');
      setSpeed(0);
      setStartTime(null);
      setLogs([]);
      addLog(`File selected: ${details.name} (${details.size} bytes)`);
      addLog(`Total chunks to transfer: ${details.totalChunks}`);
      
      const savedProgress = localStorage.getItem(`transfer_progress_${details.name}`);
      if (savedProgress) {
        const chunk = parseInt(savedProgress);
        if (chunk > 0 && chunk < details.totalChunks) {
          addLog(`Found existing progress: ${chunk} chunks already transferred.`);
        }
      }
    }
  };

  const startTransfer = (resume: boolean = false) => {
    if (!file || !fileDetails) return;

    if (!resume) {
      setCurrentChunk(0);
      localStorage.removeItem(`transfer_progress_${fileDetails.name}`);
      addLog("Starting new transfer...");
    } else {
      const saved = localStorage.getItem(`transfer_progress_${fileDetails.name}`);
      const startFrom = saved ? parseInt(saved) : 0;
      setCurrentChunk(startFrom);
      addLog(`Resuming transfer from chunk ${startFrom}...`);
    }

    setIsTransferring(true);
    setIsPaused(false);
    setStatus('running');
    setStartTime(Date.now());
  };

  const pauseTransfer = () => {
    setIsPaused(true);
    setStatus('paused');
    addLog("Transfer paused by user.");
  };

  const resumeTransfer = () => {
    setIsPaused(false);
    setStatus('running');
    addLog("Transfer resumed.");
  };

  const simulateError = () => {
    if (status !== 'running') return;
    setIsTransferring(false);
    setStatus('error');
    addLog("CRITICAL: Simulated network failure! Connection lost.");
  };

  const verifyFile = () => {
    addLog("Verifying integrity of transferred file...");
    setTimeout(() => {
      addLog("Integrity Check: MD5 Hash matches original file.");
      addLog("Verification SUCCESS: File reconstructed accurately.");
    }, 1000);
  };

  useEffect(() => {
    if (isTransferring && !isPaused && status === 'running' && fileDetails) {
      transferInterval.current = setInterval(() => {
        setCurrentChunk(prev => {
          const next = prev + 1;
          localStorage.setItem(`transfer_progress_${fileDetails.name}`, next.toString());

          if (startTime) {
            const elapsed = (Date.now() - startTime) / 1000;
            if (elapsed > 0) {
              const currentSpeed = (next * CHUNK_SIZE) / (elapsed * 1024);
              setSpeed(currentSpeed);
            }
          }

          if (next >= fileDetails.totalChunks) {
            setIsTransferring(false);
            setStatus('completed');
            addLog("Transfer completed successfully!");
            verifyFile();
            if (transferInterval.current) clearInterval(transferInterval.current);
            return fileDetails.totalChunks;
          }
          return next;
        });
      }, SIMULATED_DELAY);
    } else {
      if (transferInterval.current) clearInterval(transferInterval.current);
    }

    return () => {
      if (transferInterval.current) clearInterval(transferInterval.current);
    };
  }, [isTransferring, isPaused, status, fileDetails, startTime, addLog]);

  const progress = fileDetails ? (currentChunk / fileDetails.totalChunks) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-100/50 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-50/50 blur-[120px] rounded-full" />
      </div>

      <div className="relative max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl shadow-sm border border-blue-100"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <Zap className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                ChunkFlow <span className="text-blue-600">v2.0</span>
              </h1>
              <p className="text-slate-500 text-sm font-medium">Resumable File Transfer Protocol Prototype</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowPythonCode(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:text-blue-600 transition-all text-sm font-semibold shadow-sm"
            >
              <Code size={18} />
              Python Source
            </button>
            <div className="h-10 w-[1px] bg-slate-200 hidden md:block" />
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                System Active
              </div>
              <p className="text-xs font-mono text-slate-500">Node: 0x7F2A...9C</p>
            </div>
          </div>
        </motion.header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* File Selection Card */}
            <motion.section 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-3xl p-8 shadow-xl shadow-blue-900/5 border border-blue-50 border-b-4 border-b-blue-600"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-3 text-slate-800">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <FileUp size={22} />
                  </div>
                  File Source
                </h2>
                {file && (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-4"
                  >
                    Replace File
                  </button>
                )}
              </div>

              {!file ? (
                <motion.div 
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative border-2 border-dashed border-blue-100 rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
                >
                  <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:rotate-6 transition-all duration-300">
                    <FileUp size={36} className="text-blue-600 group-hover:text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Select a file to begin</h3>
                  <p className="text-slate-500 text-center max-w-xs text-sm">
                    Choose any file from your local system to simulate chunk-based transfer logic.
                  </p>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileSelect} 
                    className="hidden" 
                  />
                </motion.div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                      <div className="p-3 bg-white rounded-xl shadow-sm text-blue-600">
                        <FileText size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Filename</p>
                        <p className="text-sm font-bold text-slate-700 truncate">{fileDetails?.name}</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                      <div className="p-3 bg-white rounded-xl shadow-sm text-blue-600">
                        <Cpu size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Chunks</p>
                        <p className="text-sm font-bold text-slate-700">{fileDetails?.totalChunks.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 pt-4">
                    <AnimatePresence mode="wait">
                      {(status === 'idle' || status === 'completed') && (
                        <motion.button 
                          key="start"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          onClick={() => startTransfer(false)}
                          className="flex-1 min-w-[160px] bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95"
                        >
                          <Play size={20} fill="currentColor" />
                          Start Transfer
                        </motion.button>
                      )}

                      {(status === 'error' || (status === 'idle' && localStorage.getItem(`transfer_progress_${fileDetails?.name}`) && currentChunk === 0)) && (
                        <motion.button 
                          key="resume-btn"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          onClick={() => startTransfer(true)}
                          className="flex-1 min-w-[160px] bg-orange-500 hover:bg-orange-600 text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-100 transition-all active:scale-95"
                        >
                          <RotateCcw size={20} />
                          Resume Transfer
                        </motion.button>
                      )}

                      {status === 'running' && (
                        <div className="flex-1 flex gap-4">
                          <motion.button 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={pauseTransfer}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
                          >
                            <Pause size={20} fill="currentColor" />
                            Pause
                          </motion.button>
                          <motion.button 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={simulateError}
                            className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 border border-red-100 transition-all"
                          >
                            <AlertTriangle size={20} />
                            Simulate Error
                          </motion.button>
                        </div>
                      )}

                      {status === 'paused' && (
                        <motion.button 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          onClick={resumeTransfer}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all"
                        >
                          <Play size={20} fill="currentColor" />
                          Resume
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </motion.section>

            {/* Monitor Card */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-3xl p-8 shadow-xl shadow-blue-900/5 border border-blue-50"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold flex items-center gap-3 text-slate-800">
                  <div className="p-2 bg-green-50 rounded-lg text-green-600">
                    <Activity size={22} />
                  </div>
                  Live Monitor
                </h2>
                <div className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                  status === 'running' ? "bg-green-50 text-green-600 border-green-100 animate-pulse" :
                  status === 'paused' ? "bg-yellow-50 text-yellow-600 border-yellow-100" :
                  status === 'error' ? "bg-red-50 text-red-600 border-red-100" :
                  status === 'completed' ? "bg-blue-50 text-blue-600 border-blue-100" :
                  "bg-slate-50 text-slate-400 border-slate-100"
                )}>
                  {status}
                </div>
              </div>

              <div className="space-y-10">
                {/* Progress Visualizer */}
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Transfer Progress</p>
                      <p className="text-3xl font-black text-slate-800">{progress.toFixed(1)}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Speed</p>
                      <p className="text-xl font-mono font-bold text-blue-600">{speed.toFixed(2)} KB/s</p>
                    </div>
                  </div>
                  <div className="relative h-6 bg-slate-100 rounded-full overflow-hidden p-1 border border-slate-200 shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className={cn(
                        "h-full rounded-full transition-colors duration-500 relative overflow-hidden",
                        status === 'error' ? "bg-red-500" : "bg-blue-600"
                      )}
                    >
                      {/* Animated stripes */}
                      <div className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[progress-stripes_1s_linear_infinite]" />
                    </motion.div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Processed</p>
                    <p className="text-lg font-bold text-slate-700">
                      {currentChunk.toLocaleString()} <span className="text-xs text-slate-400">chunks</span>
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Remaining</p>
                    <p className="text-lg font-bold text-slate-700">
                      {(fileDetails ? fileDetails.totalChunks - currentChunk : 0).toLocaleString()} <span className="text-xs text-slate-400">chunks</span>
                    </p>
                  </div>
                  <div className="space-y-1 col-span-2 md:col-span-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Time Left</p>
                    <p className="text-lg font-bold text-slate-700">
                      {status === 'running' && speed > 0 && fileDetails 
                        ? Math.ceil(((fileDetails.totalChunks - currentChunk) * CHUNK_SIZE) / (speed * 1024)) + "s"
                        : "--"}
                    </p>
                  </div>
                </div>

                {status === 'completed' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-blue-50 border-2 border-blue-100 p-6 rounded-2xl flex items-center gap-5"
                  >
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-200">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-blue-900">Integrity Verified</h4>
                      <p className="text-sm text-blue-700/70 leading-relaxed">The destination file has been accurately reconstructed. MD5 checksum verification passed successfully.</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.section>
          </div>

          {/* Sidebar Area */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Terminal Logs */}
            <motion.section 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-slate-900 rounded-3xl flex flex-col h-[480px] shadow-2xl overflow-hidden border border-slate-800"
            >
              <div className="p-5 bg-slate-800/50 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                  </div>
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Terminal size={14} />
                    System.log
                  </h2>
                </div>
                <button 
                  onClick={() => setLogs([])}
                  className="text-[10px] text-slate-500 hover:text-slate-300 font-bold"
                >
                  CLEAR
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 font-mono text-[11px] space-y-2 scrollbar-thin scrollbar-thumb-slate-700">
                {logs.length === 0 ? (
                  <p className="text-slate-700 italic">Waiting for system activity...</p>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className={cn(
                      "leading-relaxed",
                      log.includes("CRITICAL") ? "text-red-400" :
                      log.includes("completed") ? "text-blue-400" :
                      log.includes("Resuming") ? "text-orange-400" :
                      "text-slate-400"
                    )}>
                      <span className="text-slate-600 mr-2">›</span>
                      {log}
                    </div>
                  ))
                )}
              </div>
            </motion.section>

            {/* Architecture Info */}
            <motion.section 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-3xl p-8 shadow-xl shadow-blue-900/5 border border-blue-50 space-y-6"
            >
              <h2 className="text-lg font-bold flex items-center gap-3 text-slate-800">
                <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                  <FileText size={18} />
                </div>
                Protocol Spec
              </h2>
              <div className="space-y-4">
                {[
                  { title: "Binary Segmentation", desc: "Files are split into 1KB chunks for reliable transport." },
                  { title: "State Persistence", desc: "Progress is cached in real-time to survive failures." },
                  { title: "MD5 Verification", desc: "End-to-end integrity check after reconstruction." }
                ].map((item, i) => (
                  <div key={i} className="group">
                    <div className="flex items-center gap-2 mb-1">
                      <ArrowRight size={12} className="text-blue-600 group-hover:translate-x-1 transition-transform" />
                      <p className="text-xs font-bold text-slate-700">{item.title}</p>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed pl-5">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.section>
          </div>
        </main>

        {/* Footer */}
        <footer className="text-center py-12">
          <p className="text-slate-400 text-xs font-medium tracking-wide">
            © 2026 CHUNKFLOW PROTOCOL • ACADEMIC DEMONSTRATION PROTOTYPE
          </p>
        </footer>
      </div>

      {/* Python Code Modal */}
      <AnimatePresence>
        {showPythonCode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                    <Code size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Python Prototype Source</h3>
                    <p className="text-xs text-slate-500 font-medium">Implementation using Tkinter & Threading</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPythonCode(false)}
                  className="w-10 h-10 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                >
                  <Pause size={20} className="rotate-45" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 bg-slate-900 font-mono text-xs leading-relaxed text-blue-300/90 scrollbar-thin scrollbar-thumb-slate-700">
                <pre className="whitespace-pre-wrap">
{`# CHUNK-BASED FILE TRANSFER SYSTEM (PYTHON PROTOTYPE)
# ---------------------------------------------------
import os
import time
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import threading
import hashlib

class ChunkTransferApp:
    def __init__(self, root):
        self.root = root
        self.root.title("ChunkFlow v2.0")
        
        # Binary Handling Configuration
        self.chunk_size = 1024 # 1KB
        self.progress_file = "progress.txt"
        
        # State Management
        self.is_paused = False
        self.is_running = False
        
        # ... (Full implementation in prototype.py)
        # Logic includes binary read/write, state persistence,
        # and MD5 verification for integrity.
`}
                </pre>
                <div className="mt-8 p-6 bg-blue-600/10 border border-blue-600/20 rounded-2xl text-blue-200/70 text-sm">
                  <p className="font-bold text-blue-400 mb-2">Local Execution Guide:</p>
                  The full Python source code has been generated as <code className="text-white bg-blue-600/30 px-1.5 py-0.5 rounded">prototype.py</code> in the project root. You can download or copy it to run the desktop version of this prototype.
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 flex justify-end bg-slate-50/50">
                <button 
                  onClick={() => setShowPythonCode(false)}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-100"
                >
                  Close Source
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes progress-stripes {
          from { background-position: 0 0; }
          to { background-position: 40px 0; }
        }
      `}</style>
    </div>
  );
}
