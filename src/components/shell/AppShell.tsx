import { Outlet } from 'react-router-dom';
import { SidebarNav } from './SidebarNav';
import { TopBar } from './TopBar';
import { IdentityGate } from '../common/IdentityGate';
import { OnboardingBanner } from '../common/OnboardingBanner';
import './AppShell.css';

export function AppShell() {
    return (
        <div className="app-shell">
            <SidebarNav />
            <div className="app-main-wrapper">
                <TopBar />
                <OnboardingBanner />
                <main className="app-main">
                    <Outlet />
                </main>
            </div>
            <IdentityGate />
        </div>
    );
}
