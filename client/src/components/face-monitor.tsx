import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Camera, CameraOff, Eye, Minimize2, Maximize2,
  Brain, AlertTriangle, SmilePlus, Frown, Meh, HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// High-performance Rust Engine (WASM)
let rustEngine: any = null;
const initRust = async () => {
  try {
    const wasm = await import("../lib/wasm-engine/rust_analyzer");
    await wasm.default();
    rustEngine = new wasm.EngagementEngine();
    console.log("🚀 EduSense: Rust-WASM Engine Initialized");
  } catch (err) {
    console.error("Failed to load Rust-WASM engine", err);
  }
};
initRust();

const emotionLabels: Record<string, { icon: any; color: string; bg: string }> = {
  focused: { icon: Eye, color: "text-emerald-600", bg: "bg-emerald-100" },
  neutral: { icon: Meh, color: "text-blue-600", bg: "bg-blue-100" },
  happy: { icon: SmilePlus, color: "text-amber-600", bg: "bg-amber-100" },
  confused: { icon: HelpCircle, color: "text-orange-600", bg: "bg-orange-100" },
  bored: { icon: Frown, color: "text-red-600", bg: "bg-red-100" },
  distracted: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-100" },
};

interface FaceMonitorProps {
  active: boolean;
  onAnalysis?: (data: { score: number; emotion: string }) => void;
  onCameraReady?: () => void;
  onCameraFailed?: (reason: string) => void;
  intervalMs?: number;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  showScore?: boolean;
}

export function FaceMonitor({
  active,
  onAnalysis,
  onCameraReady,
  onCameraFailed,
  intervalMs = 3000,
  position = "bottom-right",
  showScore = true,
}: FaceMonitorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const scoreRef = useRef(75);
  const faceDetectedRef = useRef(true);
  
  // MediaPipe refs
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const requestRef = useRef<number>();
  const lastVideoTimeRef = useRef<number>(-1);

  const [cameraReady, setCameraReady] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [currentScore, setCurrentScore] = useState(75);
  const [currentEmotion, setCurrentEmotion] = useState("neutral");
  const [faceDetected, setFaceDetected] = useState(true);

  // Initialize MediaPipe FaceLandmarker
  useEffect(() => {
    let isActive = true;
    const initModel = async () => {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1
        });
        if (isActive) {
          faceLandmarkerRef.current = landmarker;
          setModelReady(true);
        }
      } catch (err) {
        console.error("Failed to load FaceLandmarker", err);
      }
    };
    initModel();
    return () => {
      isActive = false;
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
      }
    };
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
      onCameraReady?.();
    } catch (err: any) {
      const reason = err?.name === "NotAllowedError"
        ? "Camera access denied. Please allow camera access in your browser settings."
        : "Could not access camera. Make sure no other app is using it.";
      setCameraError(reason);
      setCameraReady(false);
      onCameraFailed?.(reason);
    }
  }, [onCameraReady, onCameraFailed]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  useEffect(() => {
    if (active) {
      startCamera();
    }
    return () => {
      stopCamera();
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [active, startCamera, stopCamera]);

  // Main MediaPipe processing loop
  const processFrame = useCallback(() => {
    if (videoRef.current && faceLandmarkerRef.current && modelReady) {
      const startTimeMs = performance.now();
      if (lastVideoTimeRef.current !== videoRef.current.currentTime) {
        lastVideoTimeRef.current = videoRef.current.currentTime;
        
        try {
          const results = faceLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);
          
          if (!results.faceBlendshapes || results.faceBlendshapes.length === 0) {
            faceDetectedRef.current = false;
            setFaceDetected(false);
          } else {
            faceDetectedRef.current = true;
            setFaceDetected(true);
            
            const shapes = results.faceBlendshapes[0].categories;
            
            if (rustEngine) {
              // Call the compiled Rust logic for better and fast calculation
              const result = rustEngine.calculate_engagement(shapes);
              scoreRef.current = result.score;
              // Emotion is handled in the interval heartbeat
            } else {
              // Fallback to JS if Rust is still loading
              const getScore = (name: string) => shapes.find((s) => s.categoryName === name)?.score || 0;
              const eyeBlink = (getScore("eyeBlinkLeft") + getScore("eyeBlinkRight")) / 2;
              const lookAway = (getScore("eyeLookOutLeft") + getScore("eyeLookInRight") + getScore("eyeLookUpLeft")) / 3;
              let targetScore = 80;
              if (eyeBlink > 0.5) targetScore = 20;
              else if (lookAway > 0.5) targetScore = 40;
              let newScore = scoreRef.current * 0.8 + targetScore * 0.2;
              scoreRef.current = Math.max(0, Math.min(100, Math.round(newScore)));
            }
          }
        } catch (err) {
          // Ignore processing errors
        }
      }
    }
    
    if (active && cameraReady) {
      requestRef.current = requestAnimationFrame(processFrame);
    }
  }, [active, cameraReady, modelReady]);

  // Start the render loop when ready
  useEffect(() => {
    if (active && cameraReady && modelReady) {
      requestRef.current = requestAnimationFrame(processFrame);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [active, cameraReady, modelReady, processFrame]);

  // State heartbeat (flush to react UI/Server at intervals)
  useEffect(() => {
    if (!cameraReady || !active || !modelReady) return;

    intervalRef.current = window.setInterval(() => {
      let score = faceDetectedRef.current ? scoreRef.current : Math.max(10, scoreRef.current - 15);
      scoreRef.current = score;
      
      let emotion = "neutral";
      if (!faceDetectedRef.current) emotion = "distracted";
      else if (score >= 80) emotion = "focused";
      else if (score >= 60) emotion = "neutral";
      else emotion = "bored";

      setCurrentScore(Math.round(score));
      setCurrentEmotion(emotion);
      onAnalysis?.({ score: Math.round(score), emotion });
    }, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [cameraReady, active, modelReady, intervalMs, onAnalysis]);

  if (!active) return null;

  const positionClass = {
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4",
  }[position];

  const emoInfo = emotionLabels[currentEmotion] || emotionLabels.neutral;
  const EmotionIcon = emoInfo.icon;
  const scoreColor = currentScore >= 75 ? "text-emerald-600" : currentScore >= 50 ? "text-amber-600" : "text-red-500";

  if (minimized) {
    return (
      <div className={cn("fixed z-50", positionClass)} data-testid="face-monitor-minimized">
        <button
          onClick={() => setMinimized(false)}
          className="w-12 h-12 rounded-full bg-slate-900 border-2 border-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
          data-testid="button-expand-camera"
        >
          <Camera className="w-5 h-5 text-white" />
          {cameraReady && (
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={cn("fixed z-50", positionClass)} data-testid="face-monitor">
      <Card className="w-64 overflow-hidden shadow-2xl border-slate-200">
        <div className="relative bg-slate-900">
          <div className="absolute top-2 left-2 z-10 flex flex-col gap-1.5">
            {cameraReady && (
              <Badge className="bg-red-500/80 text-white border-0 text-[10px] px-1.5 py-0 w-fit">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-1" />
                Camera Active
              </Badge>
            )}
            {modelReady && (
              <Badge className="bg-emerald-500/80 text-white border-0 text-[10px] px-1.5 py-0 w-fit">
                <Brain className="w-2.5 h-2.5 mr-1" />
                AI Tracking
              </Badge>
            )}
          </div>
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
            <button
              onClick={() => setMinimized(true)}
              className="w-6 h-6 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors"
              data-testid="button-minimize-camera"
            >
              <Minimize2 className="w-3 h-3 text-white" />
            </button>
          </div>

          {cameraError ? (
            <div className="h-36 flex flex-col items-center justify-center p-4">
              <CameraOff className="w-8 h-8 text-slate-500 mb-2" />
              <p className="text-[10px] text-slate-400 text-center leading-tight">{cameraError}</p>
              <Button size="sm" variant="outline" className="mt-2 h-6 text-[10px]" onClick={startCamera}>
                Retry
              </Button>
            </div>
          ) : (
            <div className="relative h-36">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
                style={{ transform: "scaleX(-1)" }}
                data-testid="video-face-monitor"
              />
              {!faceDetected && cameraReady && modelReady && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="text-center">
                    <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto mb-1" />
                    <p className="text-[10px] text-amber-300 font-medium">No face detected</p>
                  </div>
                </div>
              )}
              {cameraReady && !modelReady && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-5 h-5 border-2 border-t-white border-white/20 rounded-full animate-spin mx-auto mb-1" />
                    <p className="text-[10px] text-white font-medium">Loading AI...</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {showScore && cameraReady && modelReady && (
          <div className="px-3 py-2 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold", emoInfo.bg, emoInfo.color)}>
                <EmotionIcon className="w-3 h-3" />
                <span className="capitalize">{currentEmotion}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-muted-foreground" />
              <span className={cn("text-sm font-bold font-mono", scoreColor)} data-testid="text-face-score">
                {currentScore}%
              </span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

interface CameraConsentProps {
  title?: string;
  onConsent: (granted: boolean) => void;
}

export function CameraConsentDialog({ title, onConsent }: CameraConsentProps) {
  return (
    <Card className="max-w-md w-full mx-auto">
      <div className="p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#EFF6FF] flex items-center justify-center mx-auto mb-5">
          <Camera className="w-8 h-8 text-[#2563EB]" />
        </div>
        <h2 className="text-lg font-bold mb-2">{title || "Enable Camera for AI Monitoring"}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">
          EduSense AI uses your camera and Google MediaPipe to analyze facial expressions and detect your engagement level in real-time.
        </p>
        <div className="bg-blue-50 rounded-xl p-4 mb-6 text-left">
          <p className="text-xs font-semibold text-blue-800 mb-2">Privacy Promise:</p>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• No video is recorded or stored</li>
            <li>• Only attention scores (numbers) are sent</li>
            <li>• AI runs securely inside your web browser</li>
            <li>• Your teacher never sees your camera feed</li>
            <li>• You can minimize or disable anytime</li>
          </ul>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => onConsent(false)} data-testid="button-skip-camera">
            Skip
          </Button>
          <Button className="flex-1 bg-[#2563EB] text-white" onClick={() => onConsent(true)} data-testid="button-enable-camera">
            <Camera className="w-4 h-4 mr-1.5" /> Enable Camera
          </Button>
        </div>
      </div>
    </Card>
  );
}
