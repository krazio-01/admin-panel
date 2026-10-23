'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ADMIN_PAGES, ADMIN_ROOT_HREF, matchesPath } from '@/components/layout/navigation';

export function Breadcrumb({ root }: { root: string }) {
    const pathname = usePathname();

    const current = ADMIN_PAGES.find((page) =>
        matchesPath(pathname, page.href, { exact: page.href === ADMIN_ROOT_HREF }),
    );
    const isAtRoot = pathname === ADMIN_ROOT_HREF;

    return (
        <nav className="header-breadcrumb" aria-label="Breadcrumb">
            {isAtRoot ? (
                <span className="header-breadcrumb-root">{root}</span>
            ) : (
                <Link href={ADMIN_ROOT_HREF} className="header-breadcrumb-root">
                    {root}
                </Link>
            )}
            <span className="header-breadcrumb-separator" aria-hidden="true">
                /
            </span>
            <span className="header-breadcrumb-current" aria-current="page">
                {current?.label ?? root}
            </span>
        </nav>
    );
}
