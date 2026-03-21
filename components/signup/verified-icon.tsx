function VerifiedIcon() {
  return (
    <div
      className="flex h-20 w-20 items-center justify-center rounded-full bg-success-bg animate-[icon-bounce-in_600ms_var(--ease-default)]"
      aria-hidden="true"
    >
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-success"
      >
        <path
          d="M5 13l4 4L19 7"
          strokeDasharray="24"
          strokeDashoffset="24"
          style={{ animation: "checkmark-draw 400ms var(--ease-default) 300ms forwards" }}
        />
      </svg>
    </div>
  );
}

export { VerifiedIcon };
