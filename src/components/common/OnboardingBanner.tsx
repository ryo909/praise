import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './OnboardingBanner.css';

const STORAGE_KEY = 'onboarded';

export function OnboardingBanner() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const isOnboarded = localStorage.getItem(STORAGE_KEY);
        if (!isOnboarded) {
            setVisible(true);
        }
    }, []);

    const handleDismiss = () => {
        localStorage.setItem(STORAGE_KEY, '1');
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="onboarding-banner">
            <div className="onboarding-content">
                <span className="onboarding-icon">✨</span>
                <div className="onboarding-text">
                    <strong>ようこそ！</strong> テンプレを押すだけで称賛できます（15秒）
                </div>
                <Link to="/send" className="onboarding-action btn btn-primary">
                    試してみる
                </Link>
                <button className="onboarding-dismiss" onClick={handleDismiss}>
                    ✕
                </button>
            </div>
        </div>
    );
}
