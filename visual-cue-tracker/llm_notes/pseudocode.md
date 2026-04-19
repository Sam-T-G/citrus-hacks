# Core Engine Pseudocode

## 1. Initialization
```typescript
function initCV() {
  loadVisionFileset()
  createFaceLandmarker(GPU)
  createPoseLandmarker(GPU)
  createHandLandmarker(GPU)
  startCamera()
}
```

## 2. Render Loop (Per-Frame)
```typescript
function renderLoop() {
  // 1. Capture Frame
  let frame = videoElement
  
  // 2. Inference
  let faces = faceLandmarker.detect(frame)
  let poses = poseLandmarker.detect(frame)
  let hands = handLandmarker.detect(frame)
  
  // 3. Render Tracking
  if (debugMode) {
    drawMeshes(faces, poses, hands)
  }
  
  // 4. Abstract Detection (GestureDetector)
  let detectedCue = processGestures(faces, poses, hands)
  
  // 5. Buffer Cues
  if (detectedCue && timeSinceLastCue > COOLDOWN) {
    geminiBuffer.push(detectedCue)
    updateDOMDataLog(detectedCue)
  }
  
  requestAnimationFrame(renderLoop)
}
```

## 3. Gemini Buffer (Future Implementation)
```typescript
class GeminiDataLogger {
  buffer = []
  
  add(cue, score) {
    buffer.push({ time: Date.now(), cue, score })
  }
  
  flushForLLM() {
    // Return a compiled text string representing the last N seconds of visual cues
    // e.g., "[12:00:01] User is smiling. [12:00:03] User nods yes."
    let block = format(buffer)
    buffer = []
    return block
  }
}
```
