import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function useLenis() {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.08,
      smoothWheel: true,
    });

    lenisRef.current = lenis;

    // Keep ScrollTrigger in sync with Lenis' smooth-scroll position.
    const onScroll = () => ScrollTrigger.update();
    lenis.on('scroll', onScroll);

    // Drive Lenis from GSAP's ticker. Keep a stable reference so cleanup
    // removes THIS callback (the old code removed a brand-new function, so the
    // dead Lenis kept running after React StrictMode's remount and froze
    // scroll updates — leaving below-the-fold reveals like the footer hidden).
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Trigger positions can be wrong until fonts / images / async data settle;
    // recompute them once after mount and on full load.
    const refresh = () => ScrollTrigger.refresh();
    const rafId = requestAnimationFrame(refresh);
    window.addEventListener('load', refresh);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('load', refresh);
      lenis.off('scroll', onScroll);
      gsap.ticker.remove(raf);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return lenisRef;
}
