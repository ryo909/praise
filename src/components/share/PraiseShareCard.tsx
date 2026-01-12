import { forwardRef } from 'react';
import type { Recognition, EffectKey } from '../../lib/types';
import './PraiseShareCard.css';

interface PraiseShareCardProps {
    recognition: Recognition;
}

// Effect background colors
const EFFECT_BACKGROUNDS: Record<EffectKey, string> = {
    confetti: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    sparkle: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    clap: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    firework: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    stamp: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    none: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
};

// Effect icons
const EFFECT_ICONS: Record<EffectKey, string> = {
    confetti: '🎊',
    sparkle: '✨',
    clap: '👏',
    firework: '🎆',
    stamp: '🔖',
    none: '💬',
};

/**
 * Praise card component for image generation
 * Uses forwardRef so html2canvas can capture it
 */
export const PraiseShareCard = forwardRef<HTMLDivElement, PraiseShareCardProps>(
    function PraiseShareCard({ recognition }, ref) {
        const effectKey = recognition.effect_key || 'confetti';
        const background = EFFECT_BACKGROUNDS[effectKey];
        const icon = EFFECT_ICONS[effectKey];

        const toName = recognition.to_user?.name || '相手';
        const fromName = recognition.from_user?.name || '送信者';
        const message = recognition.message || 'いつもありがとうございます！';
        const date = new Date(recognition.created_at).toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        // Truncate message if too long
        const maxLength = 120;
        const displayMessage = message.length > maxLength
            ? message.slice(0, maxLength) + '...'
            : message;

        return (
            <div
                ref={ref}
                className="praise-share-card"
                style={{ background }}
            >
                <div className="praise-share-card-inner">
                    <div className="praise-share-card-icon">{icon}</div>

                    <div className="praise-share-card-to">
                        {toName}さんへ
                    </div>

                    <div className="praise-share-card-message">
                        {displayMessage}
                    </div>

                    <div className="praise-share-card-from">
                        — {fromName}
                    </div>

                    <div className="praise-share-card-footer">
                        <span className="praise-share-card-date">{date}</span>
                        <span className="praise-share-card-brand">Peer Praise</span>
                    </div>
                </div>
            </div>
        );
    }
);
