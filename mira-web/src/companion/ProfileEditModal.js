import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
const INPUT_STYLE = {
    width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
    border: '0.5px solid var(--hair)', background: 'var(--paper)',
    color: 'var(--ink)', fontFamily: 'var(--csans)', outline: 'none',
    boxSizing: 'border-box',
};
const TEXTAREA_STYLE = {
    ...INPUT_STYLE,
    resize: 'vertical', minHeight: 90, lineHeight: 1.55,
};
const LABEL_STYLE = {
    fontFamily: 'var(--cmono)', fontSize: 9.5, letterSpacing: '0.14em',
    textTransform: 'uppercase', color: 'var(--ink-3)', display: 'block', marginBottom: 5,
};
function Field({ label, value, onChange, multiline, hint }) {
    return (_jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("label", { style: LABEL_STYLE, children: label }), hint && _jsx("div", { style: { fontSize: 11, color: 'var(--ink-4)', marginBottom: 5 }, children: hint }), multiline
                ? _jsx("textarea", { style: TEXTAREA_STYLE, value: value, onChange: e => onChange(e.target.value) })
                : _jsx("input", { style: INPUT_STYLE, value: value, onChange: e => onChange(e.target.value) })] }));
}
export function ProfileEditModal({ store, saving, onSave, onClose }) {
    const p = store.patient;
    const [form, setForm] = useState({
        first: p.first,
        preferred: p.preferred,
        last: p.last,
        birth: p.birth,
        stage: p.stage,
        diagnosed: p.diagnosed,
        home: p.home,
        pronouns: (p.pronouns ?? 'she/her'),
        likes: p.likes.join('\n'),
        dislikes: p.dislikes.join('\n'),
        calmers: p.calmers.join('\n'),
        triggers: p.triggers.join('\n'),
    });
    const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));
    const splitLines = (s) => s.split('\n').map(l => l.trim()).filter(Boolean);
    const handleSave = async () => {
        const updated = {
            ...p,
            first: form.first.trim(),
            preferred: form.preferred.trim(),
            last: form.last.trim(),
            birth: form.birth.trim(),
            stage: form.stage.trim(),
            diagnosed: form.diagnosed.trim(),
            home: form.home.trim(),
            pronouns: form.pronouns,
            likes: splitLines(form.likes),
            dislikes: splitLines(form.dislikes),
            calmers: splitLines(form.calmers),
            triggers: splitLines(form.triggers),
        };
        await onSave({ patient: updated });
        onClose();
    };
    return (_jsx("div", { style: {
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(26,25,21,0.45)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }, children: _jsxs("div", { style: {
                width: 600, maxHeight: '90vh', background: 'var(--paper)', borderRadius: 18,
                boxShadow: '0 30px 80px rgba(0,0,0,0.25), 0 0 0 0.5px rgba(26,25,21,0.15)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }, children: [_jsxs("div", { style: {
                        padding: '18px 24px', borderBottom: '0.5px solid var(--hair)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
                    }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontFamily: 'var(--cmono)', fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 3 }, children: "Edit profile" }), _jsxs("div", { style: { fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', lineHeight: 1 }, children: [p.preferred || p.first, " ", p.last] })] }), _jsx("button", { onClick: onClose, style: { color: 'var(--ink-3)', fontSize: 22, lineHeight: 1, border: 'none', background: 'none', cursor: 'pointer', padding: 4 }, children: "\u00D7" })] }), _jsxs("div", { style: { overflowY: 'auto', padding: '24px 24px 8px', flex: 1 }, children: [_jsx("div", { style: { fontFamily: 'var(--cmono)', fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--sage-deep)', marginBottom: 14 }, children: "Identity" }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 4 }, children: [_jsx(Field, { label: "First name", value: form.first, onChange: set('first') }), _jsx(Field, { label: "Preferred name", value: form.preferred, onChange: set('preferred') }), _jsx(Field, { label: "Last name", value: form.last, onChange: set('last') })] }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("label", { style: LABEL_STYLE, children: "Pronouns" }), _jsxs("select", { style: { ...INPUT_STYLE, cursor: 'pointer' }, value: form.pronouns, onChange: e => setForm(f => ({ ...f, pronouns: e.target.value })), children: [_jsx("option", { value: "she/her", children: "she / her" }), _jsx("option", { value: "he/him", children: "he / him" }), _jsx("option", { value: "they/them", children: "they / them" })] })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 }, children: [_jsx(Field, { label: "Date of birth", value: form.birth, onChange: set('birth') }), _jsx(Field, { label: "Diagnosis stage", value: form.stage, onChange: set('stage') }), _jsx(Field, { label: "Diagnosed", value: form.diagnosed, onChange: set('diagnosed') }), _jsx(Field, { label: "Home / room", value: form.home, onChange: set('home') })] }), _jsx("div", { style: { height: 1, background: 'var(--hair)', margin: '20px 0' } }), _jsx("div", { style: { fontFamily: 'var(--cmono)', fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--sage-deep)', marginBottom: 14 }, children: "Preferences" }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 4 }, children: [_jsx(Field, { label: "Loves", value: form.likes, onChange: set('likes'), multiline: true, hint: "One item per line" }), _jsx(Field, { label: "Dislikes", value: form.dislikes, onChange: set('dislikes'), multiline: true, hint: "One item per line" }), _jsx(Field, { label: "What calms", value: form.calmers, onChange: set('calmers'), multiline: true, hint: "One item per line" }), _jsx(Field, { label: "Gently avoid", value: form.triggers, onChange: set('triggers'), multiline: true, hint: "One item per line" })] })] }), _jsxs("div", { style: {
                        padding: '16px 24px', borderTop: '0.5px solid var(--hair)',
                        display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0,
                    }, children: [_jsx("button", { onClick: onClose, style: {
                                padding: '10px 20px', borderRadius: 10, background: 'var(--paper-2)',
                                color: 'var(--ink-2)', fontSize: 13, border: '0.5px solid var(--hair)',
                                cursor: 'pointer', fontFamily: 'var(--csans)',
                            }, children: "Cancel" }), _jsx("button", { onClick: handleSave, disabled: saving, style: {
                                padding: '10px 24px', borderRadius: 10, background: 'var(--ink)',
                                color: 'var(--paper)', fontSize: 13, fontWeight: 500, border: 'none',
                                cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--csans)',
                                opacity: saving ? 0.6 : 1,
                            }, children: saving ? 'Saving…' : 'Save changes' })] })] }) }));
}
