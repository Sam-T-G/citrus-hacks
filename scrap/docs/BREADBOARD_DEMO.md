# Breadboard Demo — 5-Button Proof of Concept

This demo wires **5 buttons** onto a half-size breadboard (30 rows) to test one chord input and all four control actions before building the full device.

---

## Breadboard Basics

If you've never used a breadboard, read these two rules first — everything else follows from them.

---

### Rule 1 — Rows are connected horizontally

Every hole in the same row **on the same side** of the gap is connected internally. No wire needed between them — the board does it automatically. The two sides are **not** connected across the center gap.

```
        a    b    c    d    e  ║  f    g    h    i    j
        │                      ║                      │
  r05   ●────●────●────●────●  ║  ●────●────●────●────●
        │                      ║                      │
        └─── all 5 connected ──┘  └─── all 5 connected ┘

                               ║
                            NOT connected across here
```

---

### Rule 2 — The GND rail runs the full length

The `(−)` strip along the edge connects every hole in that strip together. One wire from the Arduino GND pin to this rail is enough to ground every button on the board.

---

## Your Button's Footprint

Your button modules have **4 legs in a 2×2 grid**. When placed on the board they land like this:

```
                  e  ║  f
                     ║
  top row    →   [L] ║ [R]    ← wire these
               [ button body ]
  top row + 2 → [L] ║ [R]    ← leave unwired (internally same as top legs)

  L = left leg (signal side)
  R = right leg (GND side)
```

The top and bottom legs on each side are the **same electrical node** — wiring the top legs only is all you need.

---

## Full Layout — Half Board (30 rows)

```
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  (−)  · · · · · · · · · · · · · · · · · · · · ← run one wire to Arduino GND │
  ├───────────────────────────────────────────────────────────────────────────── ┤
  │         a    b    c    d    e  ║  f    g    h    i    j                       │
  │                                ║                                              │
  │  r02    W───────────────────[L ║ R]───────────────────W   DOT 1   A0 / GND   │
  │  r03                        [  body  ]                                        │
  │  r04                        [L     R]  ← leave unwired                       │
  │  r05    ·    ·    ·    ·    ·  ║  ·    ·    ·    ·    ·                       │
  │                                ║                                              │
  │  r06    W───────────────────[L ║ R]───────────────────W   FINISH  D2 / GND   │
  │  r07                        [  body  ]                                        │
  │  r08                        [L     R]  ← leave unwired                       │
  │  r09    ·    ·    ·    ·    ·  ║  ·    ·    ·    ·    ·                       │
  │                                ║                                              │
  │  r10    W───────────────────[L ║ R]───────────────────W   BKSPC   D4 / GND   │
  │  r11                        [  body  ]                                        │
  │  r12                        [L     R]  ← leave unwired                       │
  │  r13    ·    ·    ·    ·    ·  ║  ·    ·    ·    ·    ·                       │
  │                                ║                                              │
  │  r14    W───────────────────[L ║ R]───────────────────W   SEND    D7 / GND   │
  │  r15                        [  body  ]                                        │
  │  r16                        [L     R]  ← leave unwired                       │
  │  r17    ·    ·    ·    ·    ·  ║  ·    ·    ·    ·    ·                       │
  │                                ║                                              │
  │  r18    W───────────────────[L ║ R]───────────────────W   SPACE   D8 / GND   │
  │  r19                        [  body  ]                                        │
  │  r20                        [L     R]  ← leave unwired                       │
  │                                ║                                              │
  ├────────────────────────────────────────────────────────────────────────────── ┤
  │  (−)  · · · · · · · · · · · · · · · · · · · · ← GND rail                    │
  └─────────────────────────────────────────────────────────────────────────────┘

  W          insert a jumper wire here
  [L ║ R]    button top legs — L in col e (left/signal), R in col f (right/GND)
  [  body ]  plastic button body floating over this row — no holes used
  [L     R]  bottom legs — same node as top legs, leave these empty
  ────       internal row connection — the board does this, no wire needed
  ║          center gap — the two halves do NOT connect across here
```

---

## Wiring Table

| Button  | Top row | Left leg, col a → Arduino pin | Right leg, col j → |
|---------|---------|-------------------------------|--------------------|
| DOT 1   | r02     | A0                            | GND rail           |
| FINISH  | r06     | D2                            | GND rail           |
| BKSPC   | r10     | D4                            | GND rail           |
| SEND    | r14     | D7                            | GND rail           |
| SPACE   | r18     | D8                            | GND rail           |
| GND tie | —       | (−) GND rail → Arduino GND    | —                  |

> All 5 buttons are wired identically — left leg to an Arduino pin, right leg to GND. The only thing that changes is which pin the left leg connects to.

---

## Step-by-Step Wiring

### Step 1 — Connect the GND rail

Run one **black wire** from any hole in the `(−)` rail to the **Arduino GND pin**.
This is the shared ground for all five buttons.

---

### Step 2 — Place the 5 buttons

Push each button into the board at the row listed, making sure:

- Top-left leg lands in **column e**
- Top-right leg lands in **column f**
- The button body floats over the row below (row N+1)
- Bottom legs fall naturally into row N+2 — leave them unwired

```
  Button    Top row
  ───────────────────
  DOT 1     r02
  FINISH    r06
  BACKSPACE r10
  SEND      r14
  SPACE     r18
```

> Each button should feel snug. If it wiggles, press the legs in more firmly.

---

### Step 3 — Wire right legs to GND (×5)

For each button, run a short **black wire**:

```
  col j, top row  ──►  (−) GND rail
```

Column j is on the right half of the board, same row as the top-right leg, so they share the same internal connection.

---

### Step 4 — Wire left legs to Arduino pins (×5)

For each button, run a **signal wire** directly from a hole in the row to the Arduino pin.
Use **col a, b, c, or d** — all four are internally connected to col e (the button leg), so any of them work. Do **not** use the `(+)` rail — that's for 5V power and is not used in this project at all.

```
  r02, col a  ──►  A0 pin on Arduino    (DOT 1)
  r06, col a  ──►  D2 pin on Arduino    (FINISH)
  r10, col a  ──►  D4 pin on Arduino    (BACKSPACE)
  r14, col a  ──►  D7 pin on Arduino    (SEND)
  r18, col a  ──►  D8 pin on Arduino    (SPACE)
```

This is a direct point-to-point connection — one end of the wire in the breadboard row, the other end straight into the Arduino pin. No rail involved.

> Use a different colour for each signal wire — it makes tracing mistakes much easier.

---

### Step 5 — Pre-power checklist

Before connecting USB, verify:

- [ ] One wire from GND rail to Arduino GND
- [ ] All 5 buttons straddle the center gap (legs in col e and col f)
- [ ] All 5 right-leg wires go from col j to the GND rail
- [ ] All 5 left-leg wires go from col a to the correct Arduino pin
- [ ] No stray wire legs are touching an adjacent row

---

### Step 6 — Upload the firmware

1. Open `prototypes/blindaide/blindaide.ino` in **Arduino IDE**
2. **Tools → Board → Arduino Uno**
3. **Tools → Port →** select the port showing your Uno
4. Click the **Upload** button (→ arrow icon)
5. Wait for **"Done uploading"** in the status bar at the bottom

---

### Step 7 — Open Serial Monitor

**Tools → Serial Monitor** (or `Ctrl+Shift+M`)

Set the baud rate dropdown in the bottom-right corner to **9600**.
The monitor is now ready — press any button and a number should appear.

---

## Testing

### Test 1 — DOT 1 (letter A)

```
  Action:   press and release the button at r02

  Braille cell:   ● ○      Only dot 1 is raised = letter A
                  ○ ○
                  ○ ○

  Expected Serial Monitor output:   1
```

---

### Test 2 — FINISH

```
  Action:   press the button at r06

  Expected Serial Monitor output:   65
```

---

### Test 3 — BACKSPACE

```
  Action:   press the button at r10

  Expected Serial Monitor output:   66
```

---

### Test 4 — SEND

```
  Action:   press the button at r14

  Expected Serial Monitor output:   67
```

---

### Test 5 — SPACE

```
  Action:   press the button at r18

  Expected Serial Monitor output:   64
```

---

### Test 6 — Full sequence: type "A" and send

Run through all buttons in order and confirm the Serial Monitor shows each value:

```
  1.  Press + release  DOT 1    →  Serial: 1    (Braille chord for A)
  2.  Press            FINISH   →  Serial: 65   (commit the letter)
  3.  Press            SPACE    →  Serial: 64   (add a space)
  4.  Press            SEND     →  Serial: 67   (send the message)
```

If you see `1, 65, 64, 67` in that order — everything is working correctly.

---

## Troubleshooting

| Symptom | Most likely cause | Fix |
|---------|-------------------|-----|
| Nothing appears at all | Wrong baud rate | Set Serial Monitor to **9600** |
| One button does nothing | Signal or GND wire missing | Check col a → Arduino pin and col j → GND rail for that row |
| One press shows two numbers | Button bounce | Increase `DEBOUNCE_MS` from 20 to 30 in `blindaide.ino` |
| Wrong number for a button | Wire in wrong Arduino pin | Cross-check the wiring table above |
| Numbers appear with no press | Stray wire touching adjacent row | Re-seat all wires; check no leg is bridging two rows |
