interface SpinnerProps {
  size?: "s" | "m" | "l";
  className?: string;
}

export function Spinner({ size = "m", className = "" }: SpinnerProps) {
  const sizeClasses = {
    s: "w-4 h-4 border-2",
    m: "w-6 h-6 border-2",
    l: "w-8 h-8 border-3",
  };

  return (
    <div
      className={`${sizeClasses[size]} border-gray-300 border-t-blue-600 rounded-full animate-spin ${className}`}
    />
  );
}
