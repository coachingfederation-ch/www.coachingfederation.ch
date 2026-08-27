/**
 * Camera QR scanner shared by the door screen and the public attendance page.
 *
 * Native `BarcodeDetector` when the browser has it, jsQR as the fallback. The
 * component only reports the raw scanned value — every decision about what a
 * code means is taken server-side.
 */
import { useEffect, useRef } from "react";

export function TicketScanner({
  onCode,
  onError,
}: {
  onCode: (value: string) => void;
  onError: (message: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Detector = (window as any).BarcodeDetector;
        const detector = Detector ? new Detector({ formats: ["qr_code"] }) : null;
        const jsQR = detector ? null : (await import("jsqr")).default;

        const tick = async () => {
          if (stopped) return;
          const canvas = canvasRef.current;
          if (video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
            if (detector) {
              try {
                const codes = await detector.detect(video);
                if (codes.length > 0 && codes[0].rawValue) {
                  onCode(codes[0].rawValue as string);
                  return;
                }
              } catch {
                /* keep trying on the next frame */
              }
            } else if (jsQR) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              const ctx = canvas.getContext("2d", { willReadFrequently: true });
              if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(image.data, image.width, image.height);
                if (code?.data) {
                  onCode(code.data);
                  return;
                }
              }
            }
          }
          raf = requestAnimationFrame(() => void tick());
        };
        void tick();
      } catch {
        onError("camera");
      }
    };

    void start();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onCode, onError]);

  return (
    <div className="overflow-hidden rounded-xl bg-foreground/90">
      <video ref={videoRef} playsInline muted className="aspect-square w-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
