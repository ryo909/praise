import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CurrentUserProvider } from '../providers/CurrentUserProvider';
import { ToastProvider } from '../providers/ToastProvider';
import { AppShell } from '../components/shell/AppShell';
import { Home } from '../pages/Home';
import { Feed } from '../pages/Feed';
import { Send } from '../pages/Send';
import { Weekly } from '../pages/Weekly';
import { Profile } from '../pages/Profile';
import { Settings } from '../pages/Settings';
import { Admin } from '../pages/Admin';

export function App() {
    return (
        <BrowserRouter>
            <ToastProvider>
                <CurrentUserProvider>
                    <Routes>
                        <Route element={<AppShell />}>
                            <Route path="/" element={<Home />} />
                            <Route path="/feed" element={<Feed />} />
                            <Route path="/send" element={<Send />} />
                            <Route path="/weekly" element={<Weekly />} />
                            <Route path="/profile/:id" element={<Profile />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="/admin" element={<Admin />} />
                        </Route>
                    </Routes>
                </CurrentUserProvider>
            </ToastProvider>
        </BrowserRouter>
    );
}
