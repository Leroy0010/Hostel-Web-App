export function isIos() {
    if (typeof window === 'undefined') return false;
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
}

export function isStandalone() {
    if (typeof window === 'undefined') return false;

    const isStandAloneMq = window.matchMedia(
        '(display-mode: standalone)'
    ).matches;

    // Cast navigator to 'any' to bypass TS checking for Apple's custom property
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isStandAloneApple = (window.navigator as any).standalone === true;

    return isStandAloneMq || isStandAloneApple;
}
