import type { Recognition } from '../types';

const APP_URL = 'https://ryo909.github.io/praise/';

/**
 * Generate share text for a recognition
 */
// Update generateShareText to handle array of recipients
export function generateShareText(recognitionOrList: Recognition | Recognition[]): string {
    const isArray = Array.isArray(recognitionOrList);
    const recognition = isArray ? recognitionOrList[0] : recognitionOrList;
    const allRecognitions = isArray ? recognitionOrList : [recognitionOrList];

    // Create "to" names string (e.g. "Aさん、Bさんへ")
    const toNames = allRecognitions
        .map(r => r.to_user?.name || '相手')
        .join('、');

    const fromName = recognition.from_user?.name || '送信者';
    const message = recognition.message || 'あなたの日頃の頑張りに感謝！';

    return `${toNames}さんへ👏
${message}

— ${fromName}より
${APP_URL}`;
}

/**
 * Open LINE share with text
 */
export function shareToLine(text: string): void {
    const encodedText = encodeURIComponent(text);
    const lineUrl = `https://line.me/R/share?text=${encodedText}`;
    window.open(lineUrl, '_blank');
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        return false;
    }
}

/**
 * Download blob as file
 */
export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Generate filename for praise card
 */
export function generateCardFilename(recognition: Recognition): string {
    const date = new Date(recognition.created_at);
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const toName = recognition.to_user?.name || 'user';
    const fromName = recognition.from_user?.name || 'sender';
    return `praise_${dateStr}_${toName}_${fromName}.png`;
}

/**
 * Check if Web Share API with files is supported
 */
export function canShareFiles(): boolean {
    if (!navigator.share || !navigator.canShare) {
        return false;
    }

    // Create a test file to check support
    try {
        const testFile = new File(['test'], 'test.png', { type: 'image/png' });
        return navigator.canShare({ files: [testFile] });
    } catch {
        return false;
    }
}

/**
 * Share file using Web Share API (if supported)
 */
export async function shareFile(blob: Blob, filename: string, text?: string): Promise<boolean> {
    if (!canShareFiles()) {
        return false;
    }

    try {
        const file = new File([blob], filename, { type: 'image/png' });
        await navigator.share({
            files: [file],
            text: text || '',
        });
        return true;
    } catch (err) {
        // User cancelled or error
        console.error('Share failed:', err);
        return false;
    }
}

/**
 * Get LINE share fallback text when sharing an image
 */
export function getImageShareFallbackText(): string {
    return `📷 称賛カードを保存しました！
LINEアプリで画像を添付して送ってください。

${APP_URL}`;
}
