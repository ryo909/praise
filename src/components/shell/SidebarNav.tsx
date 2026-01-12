import { NavLink } from 'react-router-dom';
import { useCurrentUser } from '../../providers/CurrentUserProvider';
import './SidebarNav.css';

export function SidebarNav() {
    const { currentUser } = useCurrentUser();

    const navItems = [
        { path: '/', label: 'ホーム', icon: '🏠' },
        { path: '/feed', label: 'みんなの称賛', icon: '📰' },
        { path: '/send', label: '称賛を送る', icon: '✨' },
        { path: '/weekly', label: '週まとめ', icon: '📊' },
        { path: '/settings', label: '設定', icon: '⚙️' },
        { path: '/admin', label: '管理', icon: '🔧' },
    ];

    return (
        <nav className="sidebar-nav">
            <div className="sidebar-header">
                <span className="sidebar-logo">🎉</span>
                <span className="sidebar-title">Peer Praise</span>
            </div>

            <ul className="sidebar-menu">
                {navItems.map(item => (
                    <li key={item.path}>
                        <NavLink
                            to={item.path}
                            className={({ isActive }) =>
                                `sidebar-link ${isActive ? 'active' : ''}`
                            }
                        >
                            <span className="sidebar-link-icon">{item.icon}</span>
                            <span className="sidebar-link-label">{item.label}</span>
                        </NavLink>
                    </li>
                ))}
            </ul>

            {currentUser && (
                <div className="sidebar-footer">
                    <NavLink to={`/profile/${currentUser.id}`} className="sidebar-user">
                        <div className="avatar avatar-sm">
                            {currentUser.name.charAt(0)}
                        </div>
                        <div className="sidebar-user-info">
                            <span className="sidebar-user-name">{currentUser.name}</span>
                            {currentUser.dept && (
                                <span className="sidebar-user-dept">{currentUser.dept}</span>
                            )}
                        </div>
                    </NavLink>
                </div>
            )}
        </nav>
    );
}
