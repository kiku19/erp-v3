"use client";

import {
  useState,
  useEffect,
  useCallback,
  useId,
  type ReactNode,
  type HTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

/* ─────────────────────── Modal Stack ─────────────────────────────── */
// Tracks which modals are open so only the topmost one handles Escape.

const modalStack: string[] = [];

function pushModal(id: string) {
  modalStack.push(id);
}

function popModal(id: string) {
  const idx = modalStack.indexOf(id);
  if (idx !== -1) modalStack.splice(idx, 1);
}

function isTopModal(id: string): boolean {
  return modalStack.length > 0 && modalStack[modalStack.length - 1] === id;
}

function getModalDepth(id: string): number {
  const idx = modalStack.indexOf(id);
  return idx === -1 ? 0 : idx;
}

/* ─────────────────────── Types ───────────────────────────────────── */

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  width?: number;
}

interface ModalHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  actions?: ReactNode;
  onClose?: () => void;
}

interface ModalBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

interface ModalFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/* ─────────────────────── Modal ───────────────────────────────────── */

function Modal({ open, onClose, children, className, width }: ModalProps) {
  const modalId = useId();
  const [isMounted, setIsMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [depth, setDepth] = useState(0);

  // Handle mount/unmount with animation
  useEffect(() => {
    if (open) {
      setIsClosing(false);
      setIsMounted(true);
    } else if (isMounted) {
      setIsClosing(true);
    }
  }, [open, isMounted]);

  // Register/unregister in the modal stack
  useEffect(() => {
    if (open) {
      pushModal(modalId);
      setDepth(getModalDepth(modalId));
      return () => popModal(modalId);
    }
  }, [open, modalId]);

  // Fallback: unmount after exit duration if onAnimationEnd doesn't fire (e.g. jsdom)
  useEffect(() => {
    if (!isClosing) return;
    const timer = setTimeout(() => {
      setIsMounted(false);
      setIsClosing(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [isClosing]);

  const handleAnimationEnd = useCallback(() => {
    if (isClosing) {
      setIsMounted(false);
      setIsClosing(false);
    }
  }, [isClosing]);

  // Close on Escape — only the topmost modal responds
  useEffect(() => {
    if (!open) return;

    function handleEscape(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape" && isTopModal(modalId)) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose, modalId]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!isMounted) return null;

  // Each stacked modal gets a higher z-index so its overlay covers the previous dialog
  const overlayZ = 9998 + depth * 2;
  const dialogZ = 9999 + depth * 2;

  const modal = (
    <>
      {/* Overlay */}
      <div
        data-testid="modal-overlay"
        className="fixed inset-0 bg-foreground/20"
        style={{
          zIndex: overlayZ,
          animation: isClosing
            ? "modal-out var(--duration-fast) var(--ease-default) forwards"
            : "dropdown-in var(--duration-normal) var(--ease-default) forwards",
        }}
        onClick={onClose}
      />

      {/* Dialog panel */}
      <div
        role="dialog"
        aria-modal="true"
        onAnimationEnd={handleAnimationEnd}
        style={{
          zIndex: dialogZ,
          width: width != null ? `${width}px` : undefined,
          animation: isClosing
            ? "modal-out var(--duration-fast) var(--ease-default) forwards"
            : "dropdown-in var(--duration-normal) var(--ease-default) forwards",
        }}
        className={cn(
          "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          "flex flex-col rounded-lg border border-border bg-card shadow-[var(--shadow-dropdown)]",
          width == null && "w-[420px]",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>
  );

  return createPortal(modal, document.body);
}

/* ─────────────────────── ModalHeader ─────────────────────────────── */

function ModalHeader({
  title,
  description,
  actions,
  onClose,
  className,
  ...props
}: ModalHeaderProps) {
  return (
    <>
      <div
        className={cn(
          "flex items-center justify-between px-6 py-5",
          className,
        )}
        {...props}
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-subhead font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="text-body font-normal text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="flex items-center justify-center rounded-md border border-border bg-background p-2 text-foreground hover:bg-muted-hover cursor-pointer transition-colors duration-[var(--duration-fast)]"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      <div className="h-px w-full bg-border" />
    </>
  );
}

/* ─────────────────────── ModalBody ───────────────────────────────── */

function ModalBody({ children, className, ...props }: ModalBodyProps) {
  return (
    <div className={cn("px-6 py-6", className)} {...props}>
      {children}
    </div>
  );
}

/* ─────────────────────── ModalFooter ─────────────────────────────── */

function ModalFooter({ children, className, ...props }: ModalFooterProps) {
  return (
    <>
      <div className="h-px w-full bg-border" />
      <div
        className={cn(
          "flex items-center justify-end gap-2 px-6 py-4",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </>
  );
}

/* ─────────────────────── Exports ─────────────────────────────────── */

export {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  type ModalProps,
  type ModalHeaderProps,
  type ModalBodyProps,
  type ModalFooterProps,
};
