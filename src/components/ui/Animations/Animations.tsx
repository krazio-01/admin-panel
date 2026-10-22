import { Children, Fragment, type CSSProperties, type ReactNode } from 'react';
import './animations.scss';
import { classNames } from '@/utils/class-names';
import { LETTER_INTERVAL, STAGGER_INTERVAL } from '@/utils/motion';

function revealDelay(seconds: number): CSSProperties {
    return { '--reveal-delay': `${seconds.toFixed(3)}s` } as CSSProperties;
}

function Reveal({
    delay = 0,
    className,
    children,
}: {
    delay?: number;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div className={classNames('reveal', className)} style={revealDelay(delay)}>
            {children}
        </div>
    );
}

function Stagger({ className, children }: { className?: string; children: ReactNode }) {
    return (
        <div className={classNames('stagger', className)}>
            {Children.toArray(children).map((child, index) => (
                <div key={index} className="reveal" style={revealDelay(index * STAGGER_INTERVAL)}>
                    {child}
                </div>
            ))}
        </div>
    );
}

function SplitReveal({
    text,
    delay = 0,
    className,
}: {
    text: string;
    delay?: number;
    className?: string;
}) {
    const words = text.split(' ').map((word) => Array.from(word));
    const firstLetterIndexes = words.map((_, wordIndex) =>
        words.slice(0, wordIndex).reduce((count, letters) => count + letters.length, 0),
    );

    return (
        <span className={classNames('split-reveal', className)}>
            <span className="visually-hidden">{text}</span>
            {words.map((letters, wordIndex) => (
                <Fragment key={wordIndex}>
                    {wordIndex > 0 && ' '}
                    <span aria-hidden="true" className="split-reveal-word">
                        {letters.map((letter, letterIndex) => (
                            <span
                                key={letterIndex}
                                className="split-reveal-letter"
                                style={revealDelay(
                                    delay +
                                        (firstLetterIndexes[wordIndex] + letterIndex) *
                                            LETTER_INTERVAL,
                                )}
                            >
                                {letter}
                            </span>
                        ))}
                    </span>
                </Fragment>
            ))}
        </span>
    );
}

export { Reveal, SplitReveal, Stagger };
