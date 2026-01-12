import confetti from 'canvas-confetti';
import type { EffectKey } from '../types';

// Effect display labels
export const EFFECT_OPTIONS: { key: EffectKey; label: string; emoji: string }[] = [
    { key: 'confetti', label: '紙吹雪', emoji: '🎊' },
    { key: 'sparkle', label: 'キラキラ', emoji: '✨' },
    { key: 'clap', label: '拍手', emoji: '👏' },
    { key: 'firework', label: '花火', emoji: '🎆' },
    { key: 'stamp', label: 'スタンプ', emoji: '🔖' },
    { key: 'none', label: 'なし', emoji: '🔇' },
];

/**
 * Play effect based on effect_key
 */
export function playEffect(effectKey: EffectKey): void {
    switch (effectKey) {
        case 'confetti':
            confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#6366f1', '#a855f7', '#10b981', '#f59e0b'],
            });
            break;

        case 'sparkle':
            // Gold sparkle effect
            confetti({
                particleCount: 100,
                spread: 100,
                origin: { y: 0.5 },
                colors: ['#ffd700', '#ffec8b', '#fff8dc', '#f0e68c'],
                shapes: ['star'],
                scalar: 1.2,
            });
            break;

        case 'clap':
            // Multiple bursts for clapping effect
            const clapColors = ['#ff6b6b', '#ffa502', '#ff6348'];
            [0, 100, 200].forEach((delay, idx) => {
                setTimeout(() => {
                    confetti({
                        particleCount: 30,
                        spread: 40,
                        origin: { x: 0.3 + idx * 0.2, y: 0.7 },
                        colors: clapColors,
                        startVelocity: 25,
                    });
                }, delay);
            });
            break;

        case 'firework':
            // Firework burst from bottom
            const fireworkColors = ['#ff0000', '#00ff00', '#0066ff', '#ff6600', '#9900ff'];
            confetti({
                particleCount: 120,
                spread: 360,
                origin: { x: 0.5, y: 0.9 },
                colors: fireworkColors,
                startVelocity: 45,
                gravity: 0.8,
                scalar: 1.3,
            });
            // Secondary burst
            setTimeout(() => {
                confetti({
                    particleCount: 80,
                    spread: 360,
                    origin: { x: 0.5, y: 0.5 },
                    colors: fireworkColors,
                    startVelocity: 30,
                });
            }, 200);
            break;

        case 'stamp':
            // Single large "stamp" effect - minimal animation
            confetti({
                particleCount: 20,
                spread: 30,
                origin: { y: 0.6 },
                colors: ['#6366f1'],
                scalar: 2,
                gravity: 1.2,
                startVelocity: 15,
            });
            break;

        case 'none':
        default:
            // No effect
            break;
    }
}

/**
 * LocalStorage key for tracking seen effects
 */
const SEEN_EFFECTS_KEY = 'seenEffects';

/**
 * Check if an effect for a recognition has already been seen
 */
export function hasSeenEffect(recognitionId: string): boolean {
    try {
        const seen = JSON.parse(localStorage.getItem(SEEN_EFFECTS_KEY) || '[]');
        return seen.includes(recognitionId);
    } catch {
        return false;
    }
}

/**
 * Mark an effect as seen
 */
export function markEffectAsSeen(recognitionId: string): void {
    try {
        const seen: string[] = JSON.parse(localStorage.getItem(SEEN_EFFECTS_KEY) || '[]');
        if (!seen.includes(recognitionId)) {
            // Keep only last 100 to prevent unlimited growth
            const updated = [...seen, recognitionId].slice(-100);
            localStorage.setItem(SEEN_EFFECTS_KEY, JSON.stringify(updated));
        }
    } catch {
        // Ignore errors
    }
}

/**
 * Get effect label for display
 */
export function getEffectLabel(effectKey: EffectKey): string {
    const option = EFFECT_OPTIONS.find(o => o.key === effectKey);
    return option ? `${option.emoji} ${option.label}` : '';
}
