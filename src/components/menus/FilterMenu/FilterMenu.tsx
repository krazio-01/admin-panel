'use client';
import { Menu } from '@base-ui/react/menu';
import { CheckIcon, CirclePlusIcon } from 'lucide-react';
import './filterMenu.scss';

export type FilterOption<Value extends string> = { value: Value; label: string };

const ANY_VALUE = '';

export function FilterMenu<Value extends string>({
    label,
    options,
    value,
    onValueChange,
}: {
    label: string;
    options: FilterOption<Value>[];
    value: Value | undefined;
    onValueChange: (value: Value | undefined) => void;
}) {
    const selected = options.find((option) => option.value === value);

    return (
        <Menu.Root>
            <Menu.Trigger className="filter-menu" data-active={selected ? '' : undefined}>
                <CirclePlusIcon aria-hidden="true" className="filter-menu-icon" />
                {label}
                {selected && <span className="filter-menu-value">{selected.label}</span>}
            </Menu.Trigger>

            <Menu.Portal>
                <Menu.Positioner className="filter-menu-positioner" align="start" sideOffset={4}>
                    <Menu.Popup className="filter-menu-popup">
                        <Menu.RadioGroup
                            value={value ?? ANY_VALUE}
                            onValueChange={(nextValue: string) =>
                                onValueChange(
                                    nextValue === ANY_VALUE ? undefined : (nextValue as Value),
                                )
                            }
                        >
                            {[{ value: ANY_VALUE, label: 'Any' }, ...options].map((option) => (
                                <Menu.RadioItem
                                    key={option.value}
                                    value={option.value}
                                    className="filter-menu-item"
                                >
                                    <Menu.RadioItemIndicator
                                        keepMounted
                                        className="filter-menu-indicator"
                                    >
                                        <CheckIcon aria-hidden="true" />
                                    </Menu.RadioItemIndicator>
                                    {option.label}
                                </Menu.RadioItem>
                            ))}
                        </Menu.RadioGroup>
                    </Menu.Popup>
                </Menu.Positioner>
            </Menu.Portal>
        </Menu.Root>
    );
}
