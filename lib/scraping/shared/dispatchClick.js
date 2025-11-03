/**
 * Dispatches a synthetic mouse click event on the provided target.
 *
 * @param {{ evaluate: (fn: (node: Element, options: MouseEventInit) => unknown, options?: MouseEventInit) => Promise<unknown> } | null | undefined} target
 * @param {MouseEventInit} [options]
 */
export async function dispatchClick(target, options = {}) {
    if (!target) {
        return;
    }

    await target.evaluate((node, eventOverrides) => {
        const defaults = {
            bubbles: true,
            cancelable: true,
            view: window,
        };

        const event = new MouseEvent("click", {
            ...defaults,
            ...eventOverrides,
        });

        node.dispatchEvent(event);
    }, options);
}
