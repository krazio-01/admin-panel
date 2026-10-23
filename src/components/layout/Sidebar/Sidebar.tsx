'use client';
import { useId, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { m, useReducedMotion } from 'motion/react';
import { LogOutIcon } from 'lucide-react';
import './sidebar.scss';
import { Button } from '@/components/ui/Button/Button';
import { useToast } from '@/components/ui/Toast/Toast';
import { useAppContext } from '@/context/appContext';
import { api } from '@/services/client/api';
import { DURATION, EASE_OUT } from '@/utils/motion';
import {
    ADMIN_NAVIGATION,
    ADMIN_ROOT_HREF,
    ADMIN_SIGN_IN_HREF,
    matchesPath,
} from '@/components/layout/navigation';
import { initials } from '@/utils/text';

export function Sidebar({ subtitle, userName }: { subtitle: string; userName: string }) {
    const pathname = usePathname();
    const { toast } = useToast();
    const prefersReducedMotion = useReducedMotion();
    const highlightId = useId();
    const { event, stats } = useAppContext('dashboard');
    const [isSigningOut, setIsSigningOut] = useState(false);

    const signOut = async () => {
        setIsSigningOut(true);

        try {
            await api.sessions.delete('admin');
            window.location.replace(ADMIN_SIGN_IN_HREF);
        } catch (error) {
            setIsSigningOut(false);
            toast({
                title: 'Sign out failed',
                description: (error as Error).message,
                tone: 'error',
            });
        }
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <span className="sidebar-brand-mark" aria-hidden="true">
                    {event.eventName.charAt(0)}
                </span>
                <span className="sidebar-brand-text">
                    {event.eventName}
                    <small className="sidebar-brand-subtitle">{subtitle}</small>
                </span>
            </div>

            <div className="sidebar-nav">
                {ADMIN_NAVIGATION.map((group) => (
                    <nav key={group.label} className="sidebar-group" aria-label={group.label}>
                        <span className="sidebar-group-label">{group.label}</span>
                        <ul className="sidebar-links">
                            {group.items.map((item) => {
                                const isActive = matchesPath(pathname, item.href, {
                                    exact: item.href === ADMIN_ROOT_HREF,
                                });

                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            className="sidebar-link"
                                            aria-current={isActive ? 'page' : undefined}
                                        >
                                            {isActive && (
                                                <m.span
                                                    layoutId={highlightId}
                                                    className="sidebar-highlight"
                                                    transition={{
                                                        duration: prefersReducedMotion
                                                            ? 0
                                                            : DURATION.base,
                                                        ease: EASE_OUT,
                                                    }}
                                                />
                                            )}
                                            <span className="sidebar-link-icon" aria-hidden="true">
                                                <item.icon />
                                            </span>
                                            <span className="sidebar-link-label">{item.label}</span>
                                            {item.countStat && (
                                                <span className="sidebar-link-count">
                                                    {stats[item.countStat]}
                                                </span>
                                            )}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>
                ))}
            </div>

            <div className="sidebar-footer">
                <span className="sidebar-avatar" aria-hidden="true">
                    {initials(userName)}
                </span>
                <span className="sidebar-user">
                    {userName}
                    <small className="sidebar-user-role">Admin</small>
                </span>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Sign out"
                    loading={isSigningOut}
                    onClick={signOut}
                >
                    <LogOutIcon />
                </Button>
            </div>
        </aside>
    );
}
