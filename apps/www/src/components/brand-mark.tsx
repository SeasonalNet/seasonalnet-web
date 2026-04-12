"use client";

import Image from "next/image";

export function BrandMark({ className = "h-8 w-28 sm:h-9 sm:w-36" }: { className?: string }) {
  return (
    <div className={`relative shrink-0 ${className}`}>
      <Image
        src="/brand/logo-black.png"
        alt="SeasonalNet"
        fill
        priority
        sizes="(max-width: 640px) 112px, 144px"
        className="object-contain block dark:hidden"
      />
      <Image
        src="/brand/logo-white.png"
        alt="SeasonalNet"
        fill
        priority
        sizes="(max-width: 640px) 112px, 144px"
        className="object-contain hidden dark:block"
      />
    </div>
  );
}
