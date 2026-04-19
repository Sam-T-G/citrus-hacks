# Visual Cue Tracker

This project is a Vanilla TypeScript Vite application designed to track visual cues (facial expressions, poses, hand gestures) from a webcam feed using MediaPipe tasks-vision. It logs these temporal cues into a raw data stream, later designed to be consumed by an LLM like Gemini.

## Setup Instructions

1.  **Framework Setup**: Initialize the Vite app with the vanilla TypeScript template.
    ```bash
    npx create-vite@latest visual-cue-tracker --template vanilla-ts
    ```
2.  **Dependencies**: Install the required computer vision package.
    ```bash
    npm install @mediapipe/tasks-vision
    ```
3.  **Local Execution**: Start the Vite dev server.
    ```bash
    npm run dev
    ```

## Architecture

- **`src/lib/constants.ts`**: Contains the mapping of MediaPipe blendshapes/landmarks to higher-level concepts (`CUE_NAMES`) and inference rules (`STATE_WEIGHTS`).
- **`src/lib/gesture-logic.ts`**: The core `GestureDetector` that evaluates CV inputs (faces, pose, hands) and emits discrete "CueEvents" (like `nod_yes`, `smiling`, `thumbs_up`). This is completely decoupled from any UI framework.
- **`src/lib/gemini-buffer.ts`**: Buffers these cues over time and formats them into a unified chronological string or JSON array specifically for an LLM prompt context window.
- **`src/main.ts`**: Coordinates the CV loops `requestAnimationFrame`, painting tracking meshes to an HTML canvas overlay, and writing raw output logs into the DOM.
