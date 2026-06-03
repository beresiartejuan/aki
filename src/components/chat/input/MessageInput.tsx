import { Textarea } from '@/components/ui/textarea';
import { useAutoResizeTextarea } from './hooks/useAutoResizeTextarea';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({
  value,
  onChange,
  onKeyDown,
  disabled,
  placeholder = 'Escribe un mensaje...',
}: MessageInputProps) {
  const { textareaRef } = useAutoResizeTextarea(value);

  return (
    <div className="px-4 pt-3">
      <Textarea
        ref={textareaRef}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        className="min-h-[44px] max-h-[200px] w-full bg-transparent text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-0 focus:border-none border-0 p-0 shadow-none overflow-y-hidden"
        style={{ minHeight: '44px' }}
        rows={1}
      />
    </div>
  );
}
