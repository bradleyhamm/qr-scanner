import { useState, useEffect, useRef, useCallback } from "react";
import jsQR from "jsqr";

const STORAGE_KEY = "qr-scanned-cards";

function playHappy() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.start(t); osc.stop(t + 0.25);
    });
  } catch {}
}

function playSad() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [392, 349.23]; // G4, F4
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t); osc.stop(t + 0.35);
    });
  } catch {}
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export default function App() {
  const cooldown = 1000;
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const cooldownRef = useRef(false);

  const [scanned, setScanned] = useState(() => loadFromStorage());
  const [toast, setToast] = useState(null); // { msg, type }
  const [cameraError, setCameraError] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const showToast = useCallback((msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2200);
  }, []);

  const handleScan = useCallback((value) => {
    if (cooldownRef.current) return;
    cooldownRef.current = true;
    setTimeout(() => { cooldownRef.current = false; }, cooldown);

    setScanned(prev => {
      if (prev.includes(value)) {
        playSad();
        showToast(`Duplicate: ${value.length > 32 ? value.slice(0, 32) + "…" : value}`, "dup");
        return prev;
      }
      playHappy();
      showToast(`Added: ${value.length > 32 ? value.slice(0, 32) + "…" : value}`, "ok");
      const next = [...prev, value];
      saveToStorage(next);
      return next;
    });
  }, [showToast]);

  // Camera + scan loop
  useEffect(() => {
    let stream;
    let cancelled = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraActive(true);
        }
      } catch {
        if (!cancelled) setCameraError("Camera access denied or unavailable.\nPlease allow camera permissions and reload.");
        return;
      }

      const tick = () => {
        if (cancelled) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
          animRef.current = requestAnimationFrame(tick);
          return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert"
        });
        if (code?.data) handleScan(code.data);
        animRef.current = requestAnimationFrame(tick);
      };
      animRef.current = requestAnimationFrame(tick);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animRef.current);
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [handleScan]);

  const copyList = useCallback(() => {
    navigator.clipboard.writeText(scanned.join("\n")).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1500);
      showToast("Copied to clipboard!", "ok");
    }).catch(() => showToast("Copy failed", "dup"));
  }, [scanned, showToast]);

  const clearList = useCallback(() => {
    if (window.confirm(`Clear all ${scanned.length} scanned value${scanned.length !== 1 ? "s" : ""}?`)) {
      setScanned([]);
      saveToStorage([]);
    }
  }, [scanned.length]);

  return (
    <div style={styles.root}>
      <style>{css}</style>

      <header style={styles.header}>
        <div style={styles.logoGroup}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
            <rect x="1" y="1" width="6" height="6" stroke="#00ff88" strokeWidth="1.5"/>
            <rect x="11" y="1" width="6" height="6" stroke="#00ff88" strokeWidth="1.5"/>
            <rect x="1" y="11" width="6" height="6" stroke="#00ff88" strokeWidth="1.5"/>
            <rect x="2.5" y="2.5" width="3" height="3" fill="#00ff88"/>
            <rect x="12.5" y="2.5" width="3" height="3" fill="#00ff88"/>
            <rect x="2.5" y="12.5" width="3" height="3" fill="#00ff88"/>
            <rect x="11" y="11" width="2" height="2" fill="#00ff88"/>
            <rect x="14" y="11" width="3" height="2" fill="#00ff88"/>
            <rect x="11" y="14" width="2" height="3" fill="#00ff88"/>
            <rect x="15" y="15" width="2" height="2" fill="#00ff88"/>
          </svg>
          <span style={styles.logoText}>CARD SCAN</span>
        </div>
        <span style={styles.count}>
          <span style={styles.countNum}>{scanned.length}</span>
          <span style={styles.countLabel}> scanned</span>
        </span>
      </header>

      {/* Toast */}
      {toast && (
        <div
          key={toast.msg + Date.now()}
          style={{ ...styles.toast, ...(toast.type === "ok" ? styles.toastOk : styles.toastDup) }}
          className="toast-pop"
        >
          <span style={styles.toastIcon}>{toast.type === "ok" ? "✓" : "✕"}</span>
          {toast.msg}
        </div>
      )}

      {/* Scanner viewport */}
      <div style={styles.scannerWrap}>
        {cameraError ? (
          <div style={styles.cameraError}>
            <span style={{ fontSize: 32, marginBottom: 12 }}>📷</span>
            <span style={{ whiteSpace: "pre-line", textAlign: "center" }}>{cameraError}</span>
          </div>
        ) : (
          <>
            <video ref={videoRef} style={styles.video} playsInline muted autoPlay />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            {/* Dimmed overlay outside the scan window */}
            <div style={styles.overlayTop} />
            <div style={styles.overlayBottom} />
            <div style={styles.overlayLeft} />
            <div style={styles.overlayRight} />
            {/* Scan frame corners */}
            <div style={styles.scanFrame}>
              <div style={{ ...styles.corner, top: 0, left: 0, borderTopColor: "#00ff88", borderLeftColor: "#00ff88" }} />
              <div style={{ ...styles.corner, top: 0, right: 0, borderTopColor: "#00ff88", borderRightColor: "#00ff88" }} />
              <div style={{ ...styles.corner, bottom: 0, left: 0, borderBottomColor: "#00ff88", borderLeftColor: "#00ff88" }} />
              <div style={{ ...styles.corner, bottom: 0, right: 0, borderBottomColor: "#00ff88", borderRightColor: "#00ff88" }} />
              <div style={styles.scanLine} className="scan-line" />
            </div>
            {!cameraActive && (
              <div style={styles.cameraLoading}>
                <div className="spinner" />
                <span style={styles.loadingText}>Starting camera…</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Scanned list */}
      <div style={styles.listSection}>
        <div style={styles.listHeader}>
          <span style={styles.listTitle}>SCANNED VALUES</span>
          {scanned.length > 0 && (
            <div style={{ display: "flex", gap: 8 }}>
              <button style={styles.btnSecondary} onClick={clearList}>Clear</button>
              <button
                style={{ ...styles.btnPrimary, ...(copySuccess ? styles.btnSuccess : {}) }}
                onClick={copyList}
              >
                {copySuccess ? "Copied ✓" : "Copy"}
              </button>
            </div>
          )}
        </div>

        <div style={styles.listBox}>
          {scanned.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>◎</span>
              <span>Point the camera at a QR code</span>
            </div>
          ) : (
            [...scanned].reverse().map((val, i) => (
              <div
                key={scanned.length - 1 - i}
                style={styles.listItem}
                className={i === 0 ? "new-item" : ""}
              >
                <span style={styles.listIndex}>{scanned.length - i}</span>
                <span style={styles.listVal} title={val}>{val}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Overlay geometry ─────────────────────────────────────────────────────────
// Scan frame: centered, 64% of width, same height
const FRAME_OFFSET = "18%";
const FRAME_SIZE = "64%";

const overlayBase = {
  position: "absolute",
  background: "rgba(0,0,0,0.45)",
  pointerEvents: "none",
};

const styles = {
  root: {
    minHeight: "100dvh",
    background: "#0a0a0f",
    color: "#e8e8e8",
    fontFamily: "'DM Mono', 'Fira Code', 'Courier New', monospace",
    display: "flex",
    flexDirection: "column",
    maxWidth: 480,
    margin: "0 auto",
    position: "relative",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "13px 18px 11px",
    borderBottom: "1px solid #1a1a28",
    background: "#0a0a0f",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  logoGroup: {
    display: "flex",
    alignItems: "center",
    gap: 9,
  },
  logoText: {
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: "0.16em",
    color: "#fff",
  },
  count: {
    fontSize: 12,
    letterSpacing: "0.06em",
  },
  countNum: {
    color: "#00ff88",
    fontWeight: 700,
  },
  countLabel: {
    color: "#444",
  },
  toast: {
    position: "fixed",
    top: 56,
    left: "50%",
    transform: "translateX(-50%)",
    padding: "9px 18px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    zIndex: 999,
    whiteSpace: "nowrap",
    maxWidth: "88vw",
    overflow: "hidden",
    textOverflow: "ellipsis",
    boxShadow: "0 6px 28px rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    gap: 8,
    letterSpacing: "0.03em",
  },
  toastIcon: {
    fontSize: 15,
    lineHeight: 1,
    flexShrink: 0,
  },
  toastOk: {
    background: "#001a0e",
    border: "1px solid #00ff8855",
    color: "#00ff88",
  },
  toastDup: {
    background: "#1a0005",
    border: "1px solid #ff445566",
    color: "#ff6677",
  },
  scannerWrap: {
    position: "relative",
    width: "100%",
    aspectRatio: "1 / 1",
    background: "#000",
    overflow: "hidden",
    flexShrink: 0,
  },
  video: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  overlayTop: { ...overlayBase, top: 0, left: 0, right: 0, height: FRAME_OFFSET },
  overlayBottom: { ...overlayBase, bottom: 0, left: 0, right: 0, height: FRAME_OFFSET },
  overlayLeft: { ...overlayBase, top: FRAME_OFFSET, bottom: FRAME_OFFSET, left: 0, width: FRAME_OFFSET },
  overlayRight: { ...overlayBase, top: FRAME_OFFSET, bottom: FRAME_OFFSET, right: 0, width: FRAME_OFFSET },
  scanFrame: {
    position: "absolute",
    top: FRAME_OFFSET,
    left: FRAME_OFFSET,
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    pointerEvents: "none",
    overflow: "hidden",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderWidth: "3px",
    borderStyle: "solid",
    borderColor: "transparent",
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    background: "linear-gradient(90deg, transparent 0%, #00ff88 40%, #00ff88 60%, transparent 100%)",
    boxShadow: "0 0 8px #00ff88aa",
  },
  cameraError: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
    color: "#ff6677",
    fontSize: 14,
    padding: 28,
    gap: 6,
    lineHeight: 1.6,
  },
  cameraLoading: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#000",
    zIndex: 5,
  },
  loadingText: {
    marginTop: 12,
    color: "#555",
    fontSize: 13,
    letterSpacing: "0.06em",
  },
  listSection: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: "14px 16px 24px",
    minHeight: 0,
  },
  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  listTitle: {
    fontSize: 10,
    letterSpacing: "0.18em",
    color: "#444",
  },
  btnPrimary: {
    background: "#001a0e",
    border: "1px solid #00ff8844",
    color: "#00ff88",
    borderRadius: 6,
    padding: "6px 16px",
    fontSize: 12,
    fontFamily: "inherit",
    cursor: "pointer",
    letterSpacing: "0.08em",
    transition: "all 0.15s ease",
    minWidth: 70,
  },
  btnSuccess: {
    background: "#003318",
    border: "1px solid #00ff88aa",
  },
  btnSecondary: {
    background: "transparent",
    border: "1px solid #222",
    color: "#555",
    borderRadius: 6,
    padding: "6px 16px",
    fontSize: 12,
    fontFamily: "inherit",
    cursor: "pointer",
    letterSpacing: "0.08em",
    transition: "opacity 0.15s ease",
  },
  listBox: {
    flex: 1,
    overflowY: "auto",
    borderRadius: 10,
    border: "1px solid #151520",
    background: "#06060c",
  },
  emptyState: {
    padding: "36px 20px",
    textAlign: "center",
    color: "#2a2a3a",
    fontSize: 13,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    letterSpacing: "0.06em",
  },
  emptyIcon: {
    fontSize: 28,
    color: "#1a1a28",
  },
  listItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 14px",
    borderBottom: "1px solid #0f0f18",
  },
  listIndex: {
    color: "#2a2a3a",
    fontSize: 10,
    minWidth: 26,
    textAlign: "right",
    letterSpacing: "0.06em",
    flexShrink: 0,
  },
  listVal: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "#bbb",
    fontSize: 13,
    letterSpacing: "0.03em",
  },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html, body {
    background: #0a0a0f;
    overscroll-behavior: none;
    -webkit-tap-highlight-color: transparent;
    -webkit-font-smoothing: antialiased;
  }

  #root {
    min-height: 100dvh;
  }

  @keyframes scan {
    0%   { top: 0%;           opacity: 0.9; }
    48%  { opacity: 0.5; }
    50%  { top: calc(100% - 2px); opacity: 0.9; }
    100% { top: calc(100% - 2px); opacity: 0.9; }
  }
  .scan-line {
    animation: scan 2.4s ease-in-out infinite;
  }

  @keyframes toast-pop {
    0%   { opacity: 0; transform: translateX(-50%) translateY(-6px) scale(0.96); }
    12%  { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
    78%  { opacity: 1; }
    100% { opacity: 0; transform: translateX(-50%) translateY(0) scale(1); }
  }
  .toast-pop { animation: toast-pop 2.2s ease forwards; }

  @keyframes new-item-flash {
    0%   { background: #00ff8818; }
    100% { background: transparent; }
  }
  .new-item { animation: new-item-flash 1.2s ease forwards; }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .spinner {
    width: 30px; height: 30px;
    border: 2px solid #1a1a28;
    border-top-color: #00ff88;
    border-radius: 50%;
    animation: spin 0.75s linear infinite;
  }

  button:active { opacity: 0.65; transform: scale(0.96); }

  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1e1e2e; border-radius: 2px; }
`;
