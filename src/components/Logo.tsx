/** A drawn italic function mark, shared with the application icon. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path
        d="M30 5.4c-1.5-.8-3-1.2-4.7-1.2-5.8 0-9 3.8-10.2 9.5l-.8 4H9.5l-.8 3.7h4.8L11.7 30c-.7 3.3-2.1 4.8-4.6 4.8-.9 0-1.8-.2-2.6-.6l-.9 3.4c1.1.6 2.5.9 4 .9 5.3 0 8.4-3.4 9.6-9.2l1.7-7.9h6l.8-3.7h-6l.9-4.2c.8-3.9 2.4-5.7 5.2-5.7 1.1 0 2.1.3 3.2.8L30 5.4Z"
        fill="currentColor"
        transform="translate(3 -1)"
      />
    </svg>
  );
}
