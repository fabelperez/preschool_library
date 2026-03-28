"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface BarcodeScannerProps {
  onScan: (isbn: string) => void;
  placeholder?: string;
}

export default function BarcodeScanner({ onScan, placeholder = "Scan or type ISBN..." }: BarcodeScannerProps) {
  const [manualInput, setManualInput] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<unknown>(null);

  const stopCamera = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        const scanner = html5QrCodeRef.current as { stop: () => Promise<void>; clear: () => void };
        await scanner.stop();
        scanner.clear();
      } catch {
        // ignore
      }
      html5QrCodeRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = async () => {
    setError(null);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("barcode-reader");
      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 100 } },
        (decodedText: string) => {
          const cleaned = decodedText.replace(/[^0-9X]/gi, "");
          if (cleaned.length === 10 || cleaned.length === 13) {
            onScan(cleaned);
            stopCamera();
          }
        },
        () => {} // ignore scan failures
      );
      setCameraActive(true);
    } catch (err) {
      setError("Could not access camera. Try typing the ISBN manually.");
      console.error(err);
    }
  };

  // USB barcode scanner support - listens for rapid keystrokes
  useEffect(() => {
    let buffer = "";
    let timeout: ReturnType<typeof setTimeout>;

    const handleKeyPress = (e: KeyboardEvent) => {
      // USB scanners type quickly and end with Enter
      if (e.key === "Enter" && buffer.length >= 10) {
        const cleaned = buffer.replace(/[^0-9X]/gi, "");
        if (cleaned.length === 10 || cleaned.length === 13) {
          onScan(cleaned);
          buffer = "";
          return;
        }
      }

      if (/[0-9X]/i.test(e.key)) {
        buffer += e.key;
      }

      clearTimeout(timeout);
      timeout = setTimeout(() => {
        buffer = "";
      }, 100);
    };

    window.addEventListener("keypress", handleKeyPress);
    return () => {
      window.removeEventListener("keypress", handleKeyPress);
      clearTimeout(timeout);
    };
  }, [onScan]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = manualInput.replace(/[^0-9X]/gi, "");
    if (cleaned.length >= 10) {
      onScan(cleaned);
      setManualInput("");
    }
  };

  return (
    <div className="space-y-4">
      {/* Manual input */}
      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <input
          type="text"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Look Up
        </button>
      </form>

      {/* Camera toggle */}
      <div className="flex gap-2">
        {!cameraActive ? (
          <button
            onClick={startCamera}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            📷 Use Camera
          </button>
        ) : (
          <button
            onClick={stopCamera}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            ⏹ Stop Camera
          </button>
        )}
        <span className="text-sm text-gray-500 self-center">
          or use a USB barcode scanner
        </span>
      </div>

      {error && (
        <p className="text-red-600 text-sm">{error}</p>
      )}

      {/* Camera view */}
      <div
        id="barcode-reader"
        ref={scannerRef}
        className={cameraActive ? "border rounded-lg overflow-hidden" : "hidden"}
      />
    </div>
  );
}
