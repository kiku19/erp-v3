import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "./modal";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("Modal", () => {
  it("renders nothing when open is false", () => {
    render(
      <Modal open={false} onClose={() => {}}>
        <ModalBody>Hidden content</ModalBody>
      </Modal>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders a dialog when open is true", () => {
    render(
      <Modal open onClose={() => {}}>
        <ModalBody>Visible content</ModalBody>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("Visible content")).toBeDefined();
  });

  it("renders into a portal (document.body)", () => {
    const { container } = render(
      <Modal open onClose={() => {}}>
        <ModalBody>Portal content</ModalBody>
      </Modal>,
    );
    // The dialog should NOT be inside the render container
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    // But it should be in the document
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it("calls onClose when Escape is pressed", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose}>
        <ModalBody>Escape test</ModalBody>
      </Modal>,
    );
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose}>
        <ModalBody>Backdrop test</ModalBody>
      </Modal>,
    );
    const overlay = document.querySelector("[data-testid='modal-overlay']");
    expect(overlay).not.toBeNull();
    await user.click(overlay!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when modal content is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose}>
        <ModalBody>Click inside</ModalBody>
      </Modal>,
    );
    await user.click(screen.getByText("Click inside"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("applies custom className to the modal panel", () => {
    render(
      <Modal open onClose={() => {}} className="custom-modal">
        <ModalBody>Styled</ModalBody>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("custom-modal");
  });

  it("unmounts after closing animation completes", async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Modal open onClose={onClose}>
        <ModalBody>Animate</ModalBody>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toBeDefined();

    // Close the modal
    rerender(
      <Modal open={false} onClose={onClose}>
        <ModalBody>Animate</ModalBody>
      </Modal>,
    );

    // After the animation timeout (150ms), dialog should unmount
    await waitFor(
      () => {
        expect(screen.queryByRole("dialog")).toBeNull();
      },
      { timeout: 300 },
    );
  });

  it("applies custom width via style prop", () => {
    render(
      <Modal open onClose={() => {}} width={480}>
        <ModalBody>Wide</ModalBody>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.style.width).toBe("480px");
  });
});

describe("ModalHeader", () => {
  it("renders title and description", () => {
    render(
      <Modal open onClose={() => {}}>
        <ModalHeader
          title="Create EPS"
          description="Create a new Enterprise Project Structure"
          onClose={() => {}}
        />
      </Modal>,
    );
    expect(screen.getByText("Create EPS")).toBeDefined();
    expect(screen.getByText("Create a new Enterprise Project Structure")).toBeDefined();
  });

  it("renders close button that calls onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose}>
        <ModalHeader title="Test" onClose={onClose} />
      </Modal>,
    );
    const closeBtn = screen.getByLabelText("Close modal");
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("ModalBody", () => {
  it("renders children with padding", () => {
    render(
      <Modal open onClose={() => {}}>
        <ModalBody>
          <p>Form content</p>
        </ModalBody>
      </Modal>,
    );
    expect(screen.getByText("Form content")).toBeDefined();
  });
});

describe("ModalFooter", () => {
  it("renders children aligned to the end", () => {
    render(
      <Modal open onClose={() => {}}>
        <ModalFooter>
          <button>Cancel</button>
          <button>Submit</button>
        </ModalFooter>
      </Modal>,
    );
    expect(screen.getByText("Cancel")).toBeDefined();
    expect(screen.getByText("Submit")).toBeDefined();
  });
});
