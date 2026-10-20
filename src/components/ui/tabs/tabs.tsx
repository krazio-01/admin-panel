'use client';
import type { ReactNode } from 'react';
import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import './tabs.scss';
import { classNames, type WithStringClassName } from '@/utils/class-names';

type TabsItem<Value extends string> = { value: Value; label: ReactNode; disabled?: boolean };

function Tabs<Value extends string>({
    items,
    value,
    onValueChange,
    stretch = false,
    className,
    children,
}: {
    items: TabsItem<Value>[];
    value: Value;
    onValueChange: (value: Value) => void;
    stretch?: boolean;
    className?: string;
    children?: ReactNode;
}) {
    return (
        <TabsPrimitive.Root
            value={value}
            onValueChange={(nextValue: Value) => onValueChange(nextValue)}
            className={classNames('tabs', stretch && 'tabs--stretch', className)}
        >
            <TabsPrimitive.List className="tabs__list">
                {items.map((item) => (
                    <TabsPrimitive.Tab
                        key={item.value}
                        value={item.value}
                        disabled={item.disabled}
                        className="tabs__tab"
                    >
                        {item.label}
                    </TabsPrimitive.Tab>
                ))}
                <TabsPrimitive.Indicator className="tabs__indicator" renderBeforeHydration />
            </TabsPrimitive.List>
            {children}
        </TabsPrimitive.Root>
    );
}

function TabsPanel({ className, ...props }: WithStringClassName<TabsPrimitive.Panel.Props>) {
    return <TabsPrimitive.Panel className={classNames('tabs__panel', className)} {...props} />;
}

export { Tabs, TabsPanel };
export type { TabsItem };
