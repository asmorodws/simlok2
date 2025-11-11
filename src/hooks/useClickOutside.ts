'use client';

import { useEffect, RefObject } from 'react';

/**
 * Custom hook for detecting clicks outside of a component
 * Useful for closing dropdowns, modals, tooltips, etc.
 * 
 * @param ref - React ref object pointing to the element
 * @param handler - Callback function to execute when click outside is detected
 * @param enabled - Whether the hook is active (default: true)
 * 
 * @example
 * const dropdownRef = useRef<HTMLDivElement>(null);
 * const [isOpen, setIsOpen] = useState(false);
 * 
 * useClickOutside(dropdownRef, () => {
 *   setIsOpen(false);
 * });
 * 
 * return (
 *   <div ref={dropdownRef}>
 *     {isOpen && <DropdownMenu />}
 *   </div>
 * );
 */
export function useClickOutside(
  ref: RefObject<HTMLElement>,
  handler: (event: MouseEvent | TouchEvent) => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const listener = (event: MouseEvent | TouchEvent) => {
      const el = ref.current;

      // Do nothing if clicking ref's element or descendent elements
      if (!el || el.contains(event.target as Node)) {
        return;
      }

      handler(event);
    };

    // Add event listeners for both mouse and touch events
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      // Cleanup event listeners
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler, enabled]); // Reload effect if ref, handler, or enabled changes
}

/**
 * Custom hook for detecting clicks outside of multiple elements
 * 
 * @param refs - Array of React ref objects
 * @param handler - Callback function to execute when click outside is detected
 * @param enabled - Whether the hook is active (default: true)
 * 
 * @example
 * const buttonRef = useRef<HTMLButtonElement>(null);
 * const menuRef = useRef<HTMLDivElement>(null);
 * 
 * useClickOutsideMultiple([buttonRef, menuRef], () => {
 *   setIsOpen(false);
 * });
 */
export function useClickOutsideMultiple(
  refs: RefObject<HTMLElement>[],
  handler: (event: MouseEvent | TouchEvent) => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const listener = (event: MouseEvent | TouchEvent) => {
      // Check if click is inside any of the refs
      const isClickInside = refs.some((ref) => {
        const el = ref.current;
        return el && el.contains(event.target as Node);
      });

      // If click is outside all refs, call handler
      if (!isClickInside) {
        handler(event);
      }
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [refs, handler, enabled]);
}
