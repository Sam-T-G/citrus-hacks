# LLM Process Documentation & Summary

## Project Overview
BrailleVision is a real-time assistive technology module designed to translate visual social cues into tactile (Braille) and audio feedback.

## Latest Action: Probabilistic Social State Inference
- **Prompt**: "We are designing a shared vocabulary of observable nonverbal cues, then using temporal and probabilistic analysis to interpret likely speaker states in a more explainable way."
- **Action**: 
  - Implemented `CueLog` in the `GestureDetector` to store raw cues over an 8-second window.
  - Developed a weighted scoring system based on a shared vocabulary (e.g., smiling, nodding, looking away).
  - Added an "Explainability Log" in the UI to show the raw scores driving the inferred state.
  - Shifted output from direct "emotions" to probabilistic "appears [state]".

## Technical Decision: MediaPipe vs OpenCV
- **Winner**: **MediaPipe**.
- **Reasoning**: MediaPipe provides integrated "Face Blendshapes" which are essential for high-fidelity emotion detection (smiling, frowning, brow shifts). OpenCV would require building complex custom classifiers for each cue, whereas MediaPipe offers a production-grade 468-point face mesh with built-in expression inference.

## Pseudocode Breakdown
Located in `/llm_notes/pseudocode.md`. Focuses on a time-based "Cue Log" strategy to prevent jittery emotion reporting.
