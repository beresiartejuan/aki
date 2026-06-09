import { useCallback, useEffect, useRef } from 'react';

export function useAutoResizeTextarea(_value: string) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';

    // Set the height to scrollHeight, but cap it at max-height (200px as per CSS)
    const newHeight = Math.min(textarea.scrollHeight, 200);
    textarea.style.height = `${newHeight}px`;
  }, []);

  const resetHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = '44px'; // min-height
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: _value intentionally triggers resize
  useEffect(() => {
    adjustHeight();
  }, [_value, adjustHeight]);

  return { textareaRef, resetHeight, adjustHeight };
}
