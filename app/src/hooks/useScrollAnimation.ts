import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function useScrollAnimation() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.animate-on-scroll').forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'expo.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
          }
        );
      });

      gsap.utils.toArray<HTMLElement>('.animate-stagger').forEach((container) => {
        const children = container.querySelectorAll('.animate-child');
        gsap.fromTo(
          children,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'expo.out',
            stagger: 0.1,
            scrollTrigger: {
              trigger: container,
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
          }
        );
      });

      // Safety net: if a trigger doesn't fire (e.g. mis-measured positions
      // after async content), don't leave the section permanently invisible.
      gsap.delayedCall(2, () => {
        gsap.utils.toArray<HTMLElement>('.animate-on-scroll, .animate-child').forEach((el) => {
          if (Number(gsap.getProperty(el, 'opacity')) === 0) gsap.set(el, { opacity: 1, y: 0 });
        });
      });
    }, ref);

    return () => ctx.revert();
  }, []);

  return ref;
}
