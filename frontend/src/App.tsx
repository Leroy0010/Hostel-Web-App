import React from 'react';
import {
    Combobox,
    ComboboxChip,
    ComboboxChips,
    ComboboxChipsInput,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxItem,
    ComboboxList,
    ComboboxValue,
    useComboboxAnchor,
} from './components/ui/combobox';

const items = [
    'React',
    'Vue',
    'Angular',
    'Spring Boot',
    'Django',
    'Flask',
    'Express',
    'ASP.NET',
    'Ruby on Rails',
    'Go',
    'Rust',
] as const;

export function App() {
    const anchor = useComboboxAnchor();
    return (
        <div className="flex min-h-svh p-6">
            <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
                <div>
                    <Combobox
                        multiple
                        autoHighlight
                        items={items}
                        defaultValue={[items[0]]}
                    >
                        <ComboboxChips ref={anchor} className="w-full max-w-xs">
                            <ComboboxValue>
                                {(values) => (
                                    <React.Fragment>
                                        {values.map((value: string) => (
                                            <ComboboxChip key={value}>
                                                {value}
                                            </ComboboxChip>
                                        ))}
                                        <ComboboxChipsInput />
                                    </React.Fragment>
                                )}
                            </ComboboxValue>
                        </ComboboxChips>
                        <ComboboxContent anchor={anchor}>
                            <ComboboxEmpty>No items found.</ComboboxEmpty>
                            <ComboboxList>
                                {(item) => (
                                    <ComboboxItem key={item} value={item}>
                                        {item}
                                    </ComboboxItem>
                                )}
                            </ComboboxList>
                        </ComboboxContent>
                    </Combobox>
                </div>
                <div className="font-mono text-xs text-muted-foreground">
                    (Press <kbd>d</kbd> to toggle dark mode)
                </div>
            </div>
        </div>
    );
}

export default App;
