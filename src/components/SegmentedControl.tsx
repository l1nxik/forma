import { useId } from 'react';
import { motion } from 'motion/react';

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  className = '',
  disabled = false,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className={`segmented ${className}`} role="radiogroup" aria-label={label}>
      {options.map((option, index) => (
        <button
          key={option.value}
          role="radio"
          aria-checked={value === option.value}
          tabIndex={value === option.value ? 0 : -1}
          disabled={disabled}
          className={value === option.value ? 'selected' : ''}
          onClick={() => onChange(option.value)}
          onKeyDown={(event) => {
            const offset = ['ArrowRight', 'ArrowDown'].includes(event.key)
              ? 1
              : ['ArrowLeft', 'ArrowUp'].includes(event.key)
                ? -1
                : 0;
            if (!offset && !['Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const next =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? options.length - 1
                  : (index + offset + options.length) % options.length;
            onChange(options[next].value);
            (event.currentTarget.parentElement?.children[next] as HTMLButtonElement)?.focus();
          }}
        >
          {value === option.value && (
            <motion.span
              className="segment-lens"
              layoutId={id}
              transition={{ type: 'spring', stiffness: 500, damping: 38 }}
            />
          )}
          <span className="segment-label">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
