import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const discoverLinks = [
  { label: 'All Services', to: '/services' },
  { label: 'Home Cleaning', to: '/services?q=Cleaning' },
  { label: 'Repairs & Maintenance', to: '/services?q=Handyman' },
  { label: 'Moving & Delivery', to: '/services?q=Moving' },
  { label: 'Event Services', to: '/services?q=Event' },
  { label: 'Health & Wellness', to: '/services?q=Fitness' },
];

const companyLinks = [
  { label: 'About Us', to: '/about' },
  { label: 'Careers', to: '/about' },
  { label: 'Blog', to: '/about' },
  { label: 'Press', to: '/about' },
  { label: 'Contact', to: '/about' },
];

const supportLinks = [
  { label: 'Help Center', to: '/about' },
  { label: 'Safety', to: '/about' },
  { label: 'Terms of Service', to: '/about' },
  { label: 'Privacy Policy', to: '/about' },
  { label: 'Sitemap', to: '/' },
];

export default function Footer() {
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!footerRef.current) return;
    const ctx = gsap.context(() => {
      const cols = footerRef.current!.querySelectorAll('.footer-col');
      const reveal = gsap.fromTo(cols,
        { opacity: 0, y: 20 },
        {
          opacity: 1, y: 0,
          duration: 0.6,
          ease: 'expo.out',
          stagger: 0.08,
          scrollTrigger: {
            trigger: footerRef.current,
            start: 'top 95%',
          },
        }
      );
      // Safety net: if the reveal never runs (e.g. trigger positions were
      // mis-measured after async content changed the page height), make sure
      // the footer is never left as a blank dark block.
      gsap.delayedCall(2, () => {
        if (reveal.progress() === 0) gsap.set(cols, { opacity: 1, y: 0 });
      });
    }, footerRef);
    return () => ctx.revert();
  }, []);

  return (
    <footer ref={footerRef} className="bg-[#1A1A1A] text-white">
      <div className="max-w-[1200px] mx-auto px-6 pt-16 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Column */}
          <div className="footer-col">
            <Link to="/" className="flex items-center gap-1 mb-4">
              <span className="text-2xl font-bold lowercase tracking-tight text-white" style={{ fontFamily: 'var(--font-heading)' }}>
                neighbour
              </span>
              <svg width="10" height="14" viewBox="0 0 10 14" fill="none" className="mb-1">
                <path d="M5 0C2.24 0 0 2.24 0 5c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5zm0 6.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" fill="#FF6B35"/>
              </svg>
            </Link>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Find trusted local professionals in Khulna in minutes.
            </p>
          </div>

          {/* Discover */}
          <div className="footer-col">
            <h4 className="text-xs font-semibold uppercase tracking-[0.1em] mb-5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Discover
            </h4>
            <ul className="flex flex-col gap-3">
              {discoverLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-sm transition-colors duration-200 hover:text-[#F7C59F]"
                    style={{ color: 'rgba(255,255,255,0.6)' }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div className="footer-col">
            <h4 className="text-xs font-semibold uppercase tracking-[0.1em] mb-5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Company
            </h4>
            <ul className="flex flex-col gap-3">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-sm transition-colors duration-200 hover:text-[#F7C59F]"
                    style={{ color: 'rgba(255,255,255,0.6)' }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div className="footer-col">
            <h4 className="text-xs font-semibold uppercase tracking-[0.1em] mb-5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Support
            </h4>
            <ul className="flex flex-col gap-3">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-sm transition-colors duration-200 hover:text-[#F7C59F]"
                    style={{ color: 'rgba(255,255,255,0.6)' }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div
        className="max-w-[1200px] mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          2026 Neighbour. All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          {['Twitter', 'Instagram', 'LinkedIn', 'Facebook'].map((social) => (
            <span
              key={social}
              className="text-xs cursor-pointer transition-colors hover:text-[#F7C59F]"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              {social}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
