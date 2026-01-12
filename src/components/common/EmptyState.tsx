import { Link } from 'react-router-dom';
import './EmptyState.css';

interface EmptyStateProps {
    icon?: string;
    title: string;
    description?: string;
    action?: {
        label: string;
        to?: string;
        onClick?: () => void;
    };
    children?: React.ReactNode;
}

export function EmptyState({ icon = '📭', title, description, action, children }: EmptyStateProps) {
    return (
        <div className="empty-state">
            <div className="empty-state-icon">{icon}</div>
            <h3 className="empty-state-title">{title}</h3>
            {description && <p className="empty-state-text">{description}</p>}
            {children}
            {action && (
                action.to ? (
                    <Link to={action.to} className="btn btn-primary">
                        {action.label}
                    </Link>
                ) : (
                    <button className="btn btn-primary" onClick={action.onClick}>
                        {action.label}
                    </button>
                )
            )}
        </div>
    );
}
