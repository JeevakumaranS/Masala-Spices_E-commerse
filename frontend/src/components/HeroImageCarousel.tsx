"use client";

import { useEffect, useState } from "react";
import { SmartImage } from "@/components/ui/SmartImage";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";

type HeroImage = {
  src: string;
  alt: string;
};

export function HeroImageCarousel({ images }: { images: HeroImage[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const heroImages = images.filter((image) => image.src);

  useEffect(() => {
    if (heroImages.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % heroImages.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [heroImages.length]);

  const showPrevious = () => {
    setActiveIndex((index) => (index - 1 + heroImages.length) % heroImages.length);
  };

  const showNext = () => {
    setActiveIndex((index) => (index + 1) % heroImages.length);
  };

  if (heroImages.length === 0) return null;

  return (
    <div
      className="relative w-full max-w-full animate-fade-up"
      style={{ animationDelay: "140ms" }}
      aria-roledescription="carousel"
      aria-label="Masala House product and spice images"
    >
      <div className="w-full">
        <div className="relative overflow-hidden">
          {heroImages.map((image, index) => (
            <div
              key={image.src}
              className={index === activeIndex ? "block" : "hidden"}
              aria-hidden={index !== activeIndex}
            >
              <SmartImage
                src={image.src}
                alt={image.alt}
                aspect="aspect-[2.76/1]"
                preload={image.src.includes("photo-1552332386-f8dd00dc2f85")}
                sizes={
                  image.src.includes("photo-1552332386-f8dd00dc2f85")
                    ? "calc(100vw - 10px)"
                    : "100vw"
                }
                wrapperClassName="rounded-none"
              />
            </div>
          ))}

          <button
            type="button"
            onClick={showPrevious}
            className="absolute top-1/2 left-4 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-transparent text-white transition hover:bg-white/15"
            aria-label="Previous hero image"
          >
            <ChevronLeftIcon className="size-5" />
          </button>

          <div className="absolute inset-x-0 bottom-5 flex justify-center">
            <div className="flex items-center gap-1.5 rounded-full bg-transparent px-3 py-2">
              {heroImages.map((image, index) => (
                <button
                  key={image.src}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`size-2 rounded-full transition ${
                    index === activeIndex ? "bg-saffron-300" : "bg-white/60"
                  }`}
                  aria-label={`Show hero image ${index + 1}`}
                  aria-current={index === activeIndex ? "true" : undefined}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={showNext}
            className="absolute top-1/2 right-4 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-transparent text-white transition hover:bg-white/15"
            aria-label="Next hero image"
          >
            <ChevronRightIcon className="size-5" />
          </button>

        </div>
      </div>
    </div>
  );
}
