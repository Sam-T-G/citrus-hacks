import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getPronouns } from './pronouns';
const Ctx = createContext(null);
export function usePatientData() {
    const ctx = useContext(Ctx);
    if (!ctx)
        throw new Error('usePatientData must be inside PatientProvider');
    return ctx;
}
export function usePronouns() {
    return usePatientData().pronouns;
}
/* ── Provider ────────────────────────────────────────────── */
export function PatientProvider({ children }) {
    const [store, setStore] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        fetch('/api/patient')
            .then(r => r.json())
            .then((data) => { setStore(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);
    const updateStore = useCallback(async (updates) => {
        if (!store)
            return;
        const next = { ...store, ...updates };
        setStore(next);
        setSaving(true);
        try {
            await fetch('/api/patient', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(next, null, 2),
            });
        }
        finally {
            setSaving(false);
        }
    }, [store]);
    const currentCaregiver = store
        ? (store.caregivers.find(c => c.id === store.currentCaregiverId) ?? store.caregivers[0] ?? null)
        : null;
    const pronouns = getPronouns(store?.patient.pronouns);
    return (_jsx(Ctx.Provider, { value: { store, loading, saving, updateStore, currentCaregiver, pronouns }, children: children }));
}
