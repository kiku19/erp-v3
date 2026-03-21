function MailSentIcon() {
  return (
    <div
      className="flex h-20 w-20 items-center justify-center rounded-full bg-muted animate-[icon-scale-in_var(--duration-slow)_var(--ease-default)]"
      aria-hidden="true"
    >
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-foreground"
      >
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M22 7l-10 7L2 7" />
      </svg>
    </div>
  );
}

export { MailSentIcon };
