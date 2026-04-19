# Assistive Tech CV Module

This module represents the low-level processing engine for BrailleVision.

## Core Components
- **camera.py**: Mock webcam driver for simulation.
- **pose_detector.py**: Core landmark extraction using MediaPipe.
- **cue_detector.py**: Geometric intent mapping.
- **event_manager.py**: Haptic event queuing.
- **config.py**: Global thresholds and device IDs.

## Architecture
This project prioritizes **MediaPipe** over OpenCV for high-level social cue detection because:
1. **Lightweight Landmark Models**: MediaPipe provides optimized Face Mesh (468 pts) and Pose (33 pts) models that work natively in browsers and low-power C++ environments.
2. **Blendshapes**: Built-in support for facial expressions (smiles, blinks, brow movements) removes the need for manual CNN training.
3. **Multi-Model Pipeline**: Easily run Face, Pose, and Hand tracking in a single stabilized graph.
