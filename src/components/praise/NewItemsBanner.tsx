import './NewItemsBanner.css';

interface NewItemsBannerProps {
    count: number;
    onClick: () => void;
}

export function NewItemsBanner({ count, onClick }: NewItemsBannerProps) {
    if (count === 0) return null;

    return (
        <button className="new-items-banner" onClick={onClick}>
            <span className="new-items-icon">✨</span>
            新着が {count} 件あります
        </button>
    );
}
