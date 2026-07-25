import { describe, expect, it } from 'vitest';
import {
    PROFILE_KEY, clearProfile, createProfile, hasProfile, loadProfile, saveProfile
} from './profile.js';

function fakeStorage() {
    return {
        store: {},
        getItem(key) { return this.store[key] ?? null; },
        setItem(key, value) { this.store[key] = value; },
        removeItem(key) { delete this.store[key]; }
    };
}

describe('profile', () => {
    it('creates an empty profile and saves/loads a trimmed name', () => {
        const storage = fakeStorage();
        expect(createProfile()).toEqual({ name: '' });
        expect(saveProfile(storage, { name: '  Captain Ada  ' })).toBe(true);
        expect(loadProfile(storage)).toEqual({ name: 'Captain Ada' });
        expect(storage.store[PROFILE_KEY]).toBe(JSON.stringify({ name: 'Captain Ada' }));
    });

    it('does not count an empty or whitespace-only name as a profile', () => {
        const storage = fakeStorage();
        expect(saveProfile(storage, { name: '   ' })).toBe(true);
        expect(loadProfile(storage)).toEqual({ name: '' });
        expect(hasProfile(storage)).toBe(false);
    });

    it('reports and clears an existing profile', () => {
        const storage = fakeStorage();
        saveProfile(storage, { name: 'Captain' });
        expect(hasProfile(storage)).toBe(true);
        expect(clearProfile(storage)).toBe(true);
        expect(hasProfile(storage)).toBe(false);
        expect(loadProfile(storage)).toEqual(createProfile());
    });

    it('returns the default for missing, invalid, or malformed JSON', () => {
        const storage = fakeStorage();
        expect(loadProfile(storage)).toEqual(createProfile());
        storage.store[PROFILE_KEY] = JSON.stringify({ name: 42 });
        expect(loadProfile(storage)).toEqual(createProfile());
        storage.store[PROFILE_KEY] = '{bad json';
        expect(loadProfile(storage)).toEqual(createProfile());
    });
});
