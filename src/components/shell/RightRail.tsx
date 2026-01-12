import type { ReactNode } from 'react';
import './RightRail.css';

interface RightRailProps {
    children: ReactNode;
}

export function RightRail({ children }: RightRailProps) {
    return (
        <aside className="right-rail">
            {children}
        </aside>
    );
}

interface WidgetCardProps {
    title: string;
    icon?: string;
    children: ReactNode;
    action?: ReactNode;
}

export function WidgetCard({ title, icon, children, action }: WidgetCardProps) {
    return (
        <div className="widget-card">
            <div className="widget-header">
                <h3 className="widget-title">
                    {icon && <span className="widget-icon">{icon}</span>}
                    {title}
                </h3>
                {action}
            </div>
            <div className="widget-content">
                {children}
            </div>
        </div>
    );
}
