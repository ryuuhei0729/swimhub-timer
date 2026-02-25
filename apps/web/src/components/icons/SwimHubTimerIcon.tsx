import Image from "next/image";

export function SwimHubTimerIcon({ className }: { className?: string }) {
  return (
    <Image
      src="/icon.png"
      alt="SwimHub Timer"
      width={64}
      height={64}
      className={className}
    />
  );
}
