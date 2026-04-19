const SEP = '||';
const VALID_FACES = new Set(['plain', 'robot', 'tears', 'dizzy', 'happy', 'wink', 'dead']);
function validate(raw) {
    const cmd = {};
    if (typeof raw.face === 'string' && VALID_FACES.has(raw.face))
        cmd.face = raw.face;
    if (raw.wave === 1)
        cmd.wave = 1;
    return cmd;
}
/**
 * Parse a Gemini response of the form:
 *   "Spoken text here. || {"face":"happy","led":"warm"}"
 *
 * Returns { spoken, cmd }. If no separator or malformed JSON, cmd is {}.
 */
export function parseResponse(text) {
    const idx = text.indexOf(SEP);
    if (idx === -1)
        return { spoken: text.trim(), cmd: {} };
    const spoken = text.slice(0, idx).trim();
    try {
        const raw = JSON.parse(text.slice(idx + SEP.length).trim());
        return { spoken, cmd: validate(raw) };
    }
    catch {
        return { spoken, cmd: {} };
    }
}
