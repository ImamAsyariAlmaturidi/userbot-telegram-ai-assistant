"use client";

interface PinInputProps {
  label?: string;
  pinCount: number;
  value: number[];
  onChange: (value: number[]) => void;
  className?: string;
}

export function PinInput({
  label,
  pinCount,
  value,
  onChange,
  className = "",
}: PinInputProps) {
  const handleChange = (index: number, inputValue: string) => {
    // Hanya angka
    if (inputValue && !/^\d$/.test(inputValue)) return;

    const newValue = [...value];
    newValue[index] = inputValue
      ? parseInt(inputValue, 10)
      : (undefined as any);
    onChange(newValue);

    // Auto focus ke input berikutnya
    if (inputValue && index < pinCount - 1) {
      const nextInput = document.getElementById(`pin-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      const prevInput = document.getElementById(`pin-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="flex gap-2 justify-center">
        {Array.from({ length: pinCount }).map((_, index) => (
          <input
            key={index}
            id={`pin-input-${index}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[index]?.toString() || ""}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className="w-12 h-12 text-center text-xl font-semibold border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        ))}
      </div>
    </div>
  );
}
