import cv2
import mediapipe as mp
import numpy as np

mp_face_mesh = mp.solutions.face_mesh
mp_hands     = mp.solutions.hands

face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.6,
    min_tracking_confidence=0.5
)
hands = mp_hands.Hands(
    max_num_hands=1,
    min_detection_confidence=0.6,
    min_tracking_confidence=0.5
)


def analyze_frame(frame):
    """
    Returns a dict of detected social cues, or None if no face detected.

    Keys:
      gaze_offset  : float, ~0 = looking at camera, + = right, - = left
      smile_score  : float, larger = more smile
      brow_raise   : float, larger = brows more raised (surprise)
      brow_lower   : float, larger = brows more furrowed
      nod_pitch    : float, head tilt in vertical plane
      face_size    : int, bounding box width px (proxy for distance)
      hand_raised  : bool, open palm facing camera
    """
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    h, w = frame.shape[:2]

    face_result = face_mesh.process(rgb)
    hand_result = hands.process(rgb)

    output = {
        'gaze_offset': None,
        'smile_score': None,
        'brow_raise':  None,
        'brow_lower':  None,
        'nod_pitch':   None,
        'face_size':   None,
        'hand_raised': False
    }

    if face_result.multi_face_landmarks:
        lm = face_result.multi_face_landmarks[0].landmark

        def pt(idx):
            return np.array([lm[idx].x * w, lm[idx].y * h])

        iris_x       = lm[473].x
        eye_left_x   = lm[33].x
        eye_right_x  = lm[133].x
        eye_center_x = (eye_left_x + eye_right_x) / 2
        output['gaze_offset'] = iris_x - eye_center_x

        left_corner_y  = lm[61].y
        right_corner_y = lm[291].y
        upper_lip_y    = lm[13].y
        avg_corner_y   = (left_corner_y + right_corner_y) / 2
        output['smile_score'] = upper_lip_y - avg_corner_y

        brow_y   = lm[105].y
        eyelid_y = lm[159].y
        output['brow_raise'] = eyelid_y - brow_y

        inner_brow_dist  = abs(lm[55].x - lm[285].x)
        output['brow_lower'] = 1.0 - (inner_brow_dist / 0.1)

        nose_y = lm[4].y
        chin_y = lm[152].y
        output['nod_pitch'] = chin_y - nose_y

        xs = [lm[i].x for i in [234, 454]]
        output['face_size'] = int((xs[1] - xs[0]) * w)

    if hand_result.multi_hand_landmarks:
        hand_lm = hand_result.multi_hand_landmarks[0].landmark
        tips = [8, 12, 16, 20]
        mcps = [5, 9,  13, 17]
        fingers_up = all(hand_lm[t].y < hand_lm[m].y for t, m in zip(tips, mcps))
        output['hand_raised'] = fingers_up

    return output
