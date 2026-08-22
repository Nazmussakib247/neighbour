import { useEffect, useRef } from 'react';
import {
  Users, Shield, TrendingUp, MapPin, Star, ShieldCheck,
  Sparkles, Wrench, Zap, Camera, Hammer, Leaf,
} from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ============================================
   MARKETPLACE SHOWCASE — on-brand hero visual
   (replaces the old retro-computer easter egg with something
   that represents what the platform actually does)
   ============================================ */
function MarketplaceShowcase() {
  const items = [
    { icon: Sparkles, label: 'Cleaning' },
    { icon: Wrench, label: 'Plumbing' },
    { icon: Zap, label: 'Electrical' },
    { icon: Camera, label: 'Photography' },
    { icon: Hammer, label: 'Carpentry' },
    { icon: Leaf, label: 'Gardening' },
  ];

  return (
    <div className="relative w-[360px]">
      <div
        className="bg-white rounded-3xl border border-[rgba(26,26,26,0.06)] p-6"
        style={{ boxShadow: '0 24px 60px rgba(0,0,0,0.10)' }}
      >
        <div className="flex items-center gap-3 mb-5">
          <span className="w-10 h-10 rounded-xl bg-[#FFF5EE] flex items-center justify-center flex-shrink-0">
            <MapPin size={20} className="text-[#FF6B35]" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[#1A1A1A]">Local services in Khulna</p>
            <p className="text-xs text-[#8B7E74]">Verified pros, one tap away</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {items.map((it) => (
            <div
              key={it.label}
              className="flex flex-col items-center gap-2 py-3.5 rounded-2xl bg-[#FAF6F0] hover:bg-[#FFF5EE] transition-colors"
            >
              <it.icon size={20} className="text-[#FF6B35]" />
              <span className="text-[11px] font-medium text-[#1A1A1A]">{it.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating accent — average rating */}
      <div
        className="absolute -top-4 -right-3 bg-white rounded-2xl px-3.5 py-2 flex items-center gap-1.5"
        style={{ boxShadow: '0 12px 30px rgba(0,0,0,0.10)' }}
      >
        <Star size={15} className="text-[#FACC15] fill-[#FACC15]" />
        <span className="text-sm font-bold text-[#1A1A1A]">4.9</span>
        <span className="text-xs text-[#8B7E74]">avg rating</span>
      </div>

      {/* Floating accent — ties into the ID-verification / approval feature */}
      <div
        className="absolute -bottom-4 -left-3 bg-[#1A1A1A] text-white rounded-2xl px-3.5 py-2 flex items-center gap-1.5"
        style={{ boxShadow: '0 12px 30px rgba(0,0,0,0.12)' }}
      >
        <ShieldCheck size={15} className="text-[#22C55E]" />
        <span className="text-xs font-medium">ID-verified pros</span>
      </div>
    </div>
  );
}

const values = [
  {
    icon: Users,
    title: 'People First',
    desc: 'We believe in the power of human connection. Every feature we build starts with understanding real people\'s needs.',
  },
  {
    icon: Shield,
    title: 'Trust & Safety',
    desc: 'Your safety is our priority. We verify every professional and protect every transaction.',
  },
  {
    icon: TrendingUp,
    title: 'Continuous Growth',
    desc: 'We\'re always improving — listening to feedback, refining our platform, and expanding our community.',
  },
];

export default function About() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.about-animate').forEach((el, i) => {
        gsap.fromTo(el,
          { opacity: 0, y: 30 },
          {
            opacity: 1, y: 0,
            duration: 0.6,
            ease: 'expo.out',
            delay: i * 0.15,
            scrollTrigger: { trigger: el, start: 'top 85%' },
          }
        );
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={sectionRef} className="min-h-screen bg-white pt-[72px] page-enter">
      {/* Hero */}
      <section className="relative px-6 pt-24 pb-16 md:min-h-[70vh] flex items-center">
        <div className="w-full max-w-[1200px] mx-auto grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
          {/* Left: story */}
          <div className="max-w-[640px]">
            <p
              className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8B7E74] mb-4 opacity-0"
              style={{ animation: 'fadeInUp 0.6s 0.2s ease forwards' }}
            >
              Our Story
            </p>
            <h1
              className="text-4xl md:text-5xl font-bold text-[#1A1A1A] leading-tight opacity-0"
              style={{ fontFamily: 'var(--font-heading)', animation: 'fadeInUp 0.6s 0.4s ease forwards' }}
            >
              Building Neighbourhoods, One Connection at a Time
            </h1>
            <p
              className="mt-6 text-lg text-[#555555] leading-relaxed max-w-[560px] opacity-0"
              style={{ animation: 'fadeInUp 0.6s 0.6s ease forwards' }}
            >
              Neighbour was born in Khulna from a simple idea: finding trusted local help shouldn’t be hard. We set out to create a marketplace where quality, transparency, and community come first.
            </p>
          </div>

          {/* Right: on-brand marketplace showcase */}
          <div className="hidden lg:flex justify-center lg:justify-end">
            <div className="opacity-0" style={{ animation: 'fadeInUp 0.8s 0.7s ease forwards' }}>
              <MarketplaceShowcase />
            </div>
          </div>
        </div>

        <style>{`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </section>

      {/* Mission & Values */}
      <section className="mx-6 my-16">
        <div className="max-w-[1200px] mx-auto bg-[#FFF5EE] rounded-3xl px-8 py-16 md:px-16">
          <h2
            className="text-4xl md:text-5xl font-bold text-[#1A1A1A] text-center about-animate"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            What We Believe
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            {values.map((v) => (
              <div key={v.title} className="about-animate bg-[#F3EDE5] rounded-3xl p-8 text-center hover:bg-[#FFF5EE] transition-colors duration-200">
                <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-2xl bg-[#FFF5EE]" style={{ boxShadow: '0 8px 32px rgba(255, 107, 53, 0.15)' }}>
                  <v.icon size={28} className="text-[#FF6B35]" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>
                  {v.title}
                </h3>
                <p className="mt-2 text-sm text-[#8B7E74] leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Office Image */}
      <section className="max-w-[1200px] mx-auto px-6 pb-16">
        <div className="about-animate rounded-3xl overflow-hidden aspect-[16/7]">
          <img
            src="/images/about-office.jpg"
            alt="Neighbour office"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      </section>
    </div>
  );
}
