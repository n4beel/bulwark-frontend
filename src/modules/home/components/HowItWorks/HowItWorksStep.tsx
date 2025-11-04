'use client';

import Image from 'next/image';

export interface HowStepItem {
  step: string;
  title: string;
  description: string;
  icon: string;
  image: string;
}

interface Props {
  step: HowStepItem;
  reversed?: boolean;
}

export default function HowStepContainer({ step, reversed }: Props) {
  return (
<div
  className={`
    rounded-3xl border border-[var(--card-accent)]
    shadow-[0_10px_50px_rgba(0,0,0,0.06)]
    w-full px-6 md:px-10 py-8
    flex flex-col md:flex-row items-center justify-between gap-12 mt-4
    bg-cover bg-center bg-no-repeat
    min-h-[420px]  /* ✅ this ensures background fills full card height */
    ${reversed ? 'md:flex-row-reverse' : ''}
  `}
  style={{
    // backgroundImage: "url('/icons/How-step-bg.svg')",
  }}
>



  
      {/* LEFT CONTENT */}
      <div className="relative z-10 md:w-[30%] w-full flex flex-col items-start">
        <span className="text-xs px-3 py-1 rounded-full border border-[#A8C3FF] bg-[#E8F0FF] text-[var(--text-primary)] font-medium">
          STEP {step.step}
        </span>

        <div className="mt-4">
          <Image src={step.icon} width={143} height={135} alt="step icon" />
        </div>

        <h3 className="mt-4 text-3xl font-normal tracking-normal text-[var(--blue-deep)]">
          {step.title}
        </h3>

        <p className="text-[var(--text-primary)] leading-relaxed mt-6">
          {step.description}
        </p>
      </div>

      {/* RIGHT IMAGE */}
      <div className="relative z-10 md:w-[70%] w-full">
        <Image
          src={step.image}
          alt="step preview"
          width={900}
          height={500}
          className="rounded-2xl w-full"
        />
      </div>
    </div>
  );
}
