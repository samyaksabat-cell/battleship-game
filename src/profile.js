export const PROFILE_KEY = 'battleship-profile-v1';

export function createProfile() {
    return { name: '' };
}

export function loadProfile(storage = globalThis.localStorage) {
    try {
        const parsed = JSON.parse(storage?.getItem(PROFILE_KEY) ?? 'null');
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return createProfile();
        }
        return {
            name: typeof parsed.name === 'string' ? parsed.name.trim() : ''
        };
    } catch {
        return createProfile();
    }
}

export function saveProfile(storage = globalThis.localStorage, profile) {
    try {
        storage?.setItem(PROFILE_KEY, JSON.stringify({
            name: typeof profile?.name === 'string' ? profile.name.trim() : ''
        }));
        return true;
    } catch {
        return false;
    }
}

export function hasProfile(storage = globalThis.localStorage) {
    return loadProfile(storage).name.length > 0;
}

export function clearProfile(storage = globalThis.localStorage) {
    try {
        storage?.removeItem(PROFILE_KEY);
        return true;
    } catch {
        return false;
    }
}
