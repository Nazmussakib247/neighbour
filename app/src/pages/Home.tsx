import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ChevronLeft, ChevronRight, Shield, Star, Zap, DollarSign,
} from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import ServiceCard from '@/components/ServiceCard';
import CategoryChip from '@/components/CategoryChip';
import ProfessionalCard from '@/components/ProfessionalCard';
import { categories, featuredServices, providers, type Category } from '@/data/marketplaceData';
import { fetchCategories } from '@/lib/api';

gsap.registerPlugin(ScrollTrigger);

/* ============================================
   HERO SECTION — 3D Kinetic Cylinder
   ============================================ */
function HeroSection() {
  return (
    <section className="relative min-h-[100dvh] flex flex-col items-center justify-center px-6 overflow-hidden bg-white">
      {/* Background gradient orb */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 45%, rgba(255, 107, 53, 0.06), transparent)',
        }}
      />

      {/* 3D Cylinder */}
      <div
        className="cylinder-container z-10 opacity-0"
        style={{ animation: 'fadeIn 0.8s 0.8s ease forwards' }}
      >
        <div className="cylinder-wrapper">
          {['HIRE', 'FIND', 'BOOK', 'TRUST', 'COMPARE', 'SAVE'].map((word, i) => (
            <div
              key={word}
              className="face"
              id={`face${i + 1}`}
              style={{
                transform: `rotateY(${i * 60}deg) translateZ(320px)`,
              }}
            >
              <p>{word}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Subtitle */}
      <p
        className="relative z-10 mt-8 text-lg text-[#555555] max-w-[520px] text-center leading-relaxed opacity-0"
        style={{ animation: 'fadeInUp 0.6s 1s ease forwards' }}
      >
        Connect with trusted local professionals in Khulna. From home repairs to creative services — find the right person for any job, right in your neighbourhood.
      </p>

      {/* CTA Row */}
      <div
        className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-3 opacity-0"
        style={{ animation: 'fadeInUp 0.6s 1.2s ease forwards' }}
      >
        <Link
          to="/services"
          className="px-8 py-3.5 bg-[#1A1A1A] text-white text-sm font-medium rounded-[10px] hover:bg-[#FF6B35] transition-colors duration-200"
        >
          Explore Services
        </Link>
        <Link
          to="/signup?role=professional"
          className="px-8 py-3.5 border border-[#1A1A1A] text-[#1A1A1A] text-sm font-medium rounded-[10px] hover:bg-[#F3EDE5] transition-colors duration-200"
        >
          Join as a Professional
        </Link>
      </div>

      {/* Social Proof Avatars */}
      <div
        className="relative z-10 mt-8 flex items-center gap-3 opacity-0"
        style={{ animation: 'fadeInUp 0.6s 1.4s ease forwards' }}
      >
        <div className="flex -space-x-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="w-[52px] h-[52px] rounded-full border-2 border-white overflow-hidden bg-[#F3EDE5]"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            >
              <div className={`w-full h-full bg-gradient-to-br from-[${['#FF6B35', '#F7C59F', '#2E5CFF', '#22C55E', '#FACC15'][i - 1]}] to-[#FFE4D1] opacity-60`} />
            </div>
          ))}
        </div>
        <span className="text-sm text-[#8B7E74]">1,200+ professionals across Khulna</span>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </section>
  );
}

/* ============================================
   CATEGORY MARQUEE
   ============================================ */
function CategoryMarquee() {
  // Real categories with live active-service counts (demo data until backend responds).
  const [cats, setCats] = useState<Category[]>(categories);
  useEffect(() => {
    let cancelled = false;
    fetchCategories().then((data) => {
      if (cancelled) return;
      const withServices = (data ?? []).filter((c) => c.count > 0);
      if (withServices.length > 0) setCats(withServices);
    });
    return () => { cancelled = true; };
  }, []);

  const row1 = cats;
  const row2 = [...cats].reverse();

  return (
    <section className="marquee-section animate-on-scroll">
      <div className="marquee-container">
        {/* Row 1 — left to right */}
        <div className="marquee-row row-left">
          <div className="marquee-track">
            {[...row1, ...row1].map((cat, i) => (
              <CategoryChip key={`r1-${cat.id}-${i}`} category={cat} />
            ))}
          </div>
        </div>
        {/* Row 2 — right to left */}
        <div className="marquee-row row-right">
          <div className="marquee-track">
            {[...row2, ...row2].map((cat, i) => (
              <CategoryChip key={`r2-${cat.id}-${i}`} category={cat} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================
   HOW IT WORKS — 3D Flip Gallery
   ============================================ */
const HIW_STEPS = [
  { img: '/images/step-1-find.jpg', num: '1', title: 'Find', desc: 'Browse services and read verified reviews from real neighbours.' },
  { img: '/images/step-2-connect.jpg', num: '2', title: 'Connect', desc: 'Message professionals, compare quotes, and pick a time that suits you.' },
  { img: '/images/step-3-done.jpg', num: '3', title: 'Done', desc: 'Book, pay securely, and enjoy the job done right.' },
];
const HIW_INTERVAL = 4000; // ms each step stays on screen

function HowItWorksSection() {
  const [active, setActive] = useState(0);

  // Schedule the NEXT step after each change. Because the effect re-runs on
  // every `active` change, a manual tab click also restarts the timer — so the
  // clicked step gets a full interval instead of being instantly overridden by
  // a pending tick, and the cycle always reaches step 3 before looping to 1.
  useEffect(() => {
    const id = setTimeout(() => {
      setActive((active + 1) % HIW_STEPS.length);
    }, HIW_INTERVAL);
    return () => clearTimeout(id);
  }, [active]);

  return (
    <section className="bg-white py-20 md:py-28">
      <div className="max-w-[980px] mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8B7E74] mb-3">Simple Process</p>
          <h2 className="text-4xl md:text-5xl font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>
            Get It Done in 3 Steps
          </h2>
        </div>

        {/* Stage — one step at a time, gentle crossfade */}
        <div
          className="relative aspect-[16/9] rounded-3xl overflow-hidden bg-[#F3EDE5]"
          style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.12)' }}
        >
          {HIW_STEPS.map((s, i) => (
            <div
              key={i}
              className="absolute inset-0 transition-opacity duration-700 ease-out"
              style={{ opacity: i === active ? 1 : 0, pointerEvents: i === active ? 'auto' : 'none' }}
            >
              <img src={s.img} alt={s.title} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0.12) 46%, transparent 70%)' }} />
              <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#FF6B35] text-white text-xs font-semibold mb-3">
                  Step {s.num}
                </span>
                <h3 className="text-white text-3xl md:text-4xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>{s.title}</h3>
                <p className="mt-2 text-white/85 text-base max-w-[480px]">{s.desc}</p>
              </div>
            </div>
          ))}

          {/* Progress bars */}
          <div className="absolute top-4 left-4 right-4 flex gap-2">
            {HIW_STEPS.map((_, i) => (
              <div key={i} className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden">
                {i < active && <div className="h-full w-full bg-white/90 rounded-full" />}
                {i === active && (
                  <div
                    key={`fill-${active}`}
                    className="h-full bg-white rounded-full"
                    style={{ width: '0%', animation: `hiwFill ${HIW_INTERVAL}ms linear forwards` }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step tabs (also clickable) */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 mt-6">
          {HIW_STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`flex items-center gap-3 p-3.5 md:p-4 rounded-2xl border text-left transition-all ${
                i === active ? 'border-[#FF6B35] bg-[#FFF5EE]' : 'border-[rgba(26,26,26,0.08)] hover:bg-[#FAF6F0]'
              }`}
            >
              <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${
                i === active ? 'bg-[#FF6B35] text-white' : 'bg-[#F3EDE5] text-[#1A1A1A]'
              }`}>{s.num}</span>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${i === active ? 'text-[#FF6B35]' : 'text-[#1A1A1A]'}`}>{s.title}</p>
                <p className="text-xs text-[#8B7E74] truncate hidden sm:block">{s.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <style>{`@keyframes hiwFill { from { width: 0%; } to { width: 100%; } }`}</style>
    </section>
  );
}

/* ============================================
   FEATURED SERVICES — 3D Deck Shuffle
   ============================================ */
function FeaturedServicesSection() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const animatingRef = useRef(false);

  const animate = useCallback((isNext: boolean) => {
    if (animatingRef.current) return;
    animatingRef.current = true;

    const dir = isNext ? 1 : -1;
    const currentIdx = current;
    const nextIdx = isNext
      ? (currentIdx + 1) % featuredServices.length
      : (currentIdx - 1 + featuredServices.length) % featuredServices.length;

    const wrapper = wrapperRef.current;
    if (!wrapper) { animatingRef.current = false; return; }

    const cards = wrapper.querySelectorAll('.deck-card');
    const currentCard = cards[currentIdx] as HTMLElement;

    // Clone for illusion
    const clone = currentCard.cloneNode(true) as HTMLElement;
    clone.id = `deck-clone-${Date.now()}`;
    clone.style.position = 'absolute';
    clone.style.top = '0';
    clone.style.left = '0';
    clone.style.width = '100%';
    clone.style.zIndex = '200';
    clone.style.opacity = '1';
    wrapper.appendChild(clone);

    gsap.fromTo(
      clone,
      { transform: 'translateZ(0px) rotateY(0deg)', opacity: 1, filter: 'brightness(1)' },
      {
        transform: `translateZ(-100px) rotateY(${dir * 45}deg)`,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.inOut',
        onComplete: () => clone.remove(),
      }
    );

    gsap.fromTo(
      currentCard,
      { transform: 'translateZ(0px) rotateY(0deg)', opacity: 1 },
      {
        transform: `translateZ(-50px) rotateY(${dir * 75}deg)`,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.inOut',
      }
    );

    const nextCard = cards[nextIdx] as HTMLElement;
    gsap.fromTo(
      nextCard,
      { transform: `translateZ(-150px) rotateY(${-dir * 60}deg)`, opacity: 0, filter: `brightness(${0.9 - nextIdx * 0.02})` },
      {
        transform: 'translateZ(0px) rotateY(0deg)',
        opacity: 1,
        filter: 'brightness(1)',
        duration: 0.6,
        ease: 'power2.out',
        delay: 0.15,
        onComplete: () => {
          animatingRef.current = false;
        },
      }
    );

    setCurrent(nextIdx);
  }, [current]);

  useEffect(() => {
    const interval = setInterval(() => animate(true), 5000);
    return () => clearInterval(interval);
  }, [animate]);

  return (
    <section className="deck-shuffle-section">
      <div className="deck-container">
        <div className="flex items-baseline justify-between w-full max-w-[1200px] mb-8">
          <h2 className="text-4xl md:text-5xl font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>
            Featured Services
          </h2>
          <Link to="/services" className="text-sm text-[#FF6B35] hover:underline">
            View all →
          </Link>
        </div>

        <div ref={wrapperRef} className="deck-wrapper" id="deck-wrapper">
          {featuredServices.map((service, i) => (
            <div
              key={service.id}
              className="deck-card"
              id={`deck-card-${i + 1}`}
              style={{ zIndex: featuredServices.length - i }}
            >
              <ServiceCard service={service} />
            </div>
          ))}
        </div>

        <div className="deck-nav">
          <button className="deck-prev" id="deck-prev" onClick={() => animate(false)}>
            <ChevronLeft size={20} />
          </button>
          <button className="deck-next" id="deck-next" onClick={() => animate(true)}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ============================================
   WHY CHOOSE NEIGHBOUR
   ============================================ */
const valueProps = [
  {
    icon: Shield,
    color: '#2E5CFF',
    title: 'Verified Professionals',
    desc: 'Every pro is background-checked and ID-verified for your peace of mind.',
  },
  {
    icon: Star,
    color: '#FACC15',
    title: 'Honest Reviews',
    desc: 'Read genuine feedback from real customers in your neighbourhood.',
  },
  {
    icon: Zap,
    color: '#FF6B35',
    title: 'Instant Booking',
    desc: 'Book same-day services or schedule ahead — flexibility on your terms.',
  },
  {
    icon: DollarSign,
    color: '#22C55E',
    title: 'Fair Pricing',
    desc: 'Compare quotes upfront. No hidden fees, ever.',
  },
];

function WhyChooseSection() {
  return (
    <section className="max-w-[1200px] mx-auto px-6 py-24">
      <div className="bg-[#FFF5EE] rounded-3xl px-8 py-16 md:px-16">
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>
            Why Thousands Trust Neighbour
          </h2>
          <p className="mt-4 text-lg text-[#8B7E74] max-w-xl mx-auto">
            We've built a community where quality meets convenience.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12 animate-stagger">
          {valueProps.map((prop) => (
            <div
              key={prop.title}
              className="animate-child bg-[#F3EDE5] rounded-3xl p-6 aspect-square flex flex-col items-center text-center hover:bg-[#FFF5EE] transition-colors duration-200"
            >
              <div
                className="w-12 h-12 flex items-center justify-center rounded-xl mt-4"
                style={{ color: prop.color, boxShadow: `0 8px 32px ${prop.color}40` }}
              >
                <prop.icon size={48} strokeWidth={1.5} />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>
                {prop.title}
              </h3>
              <p className="mt-2 text-sm text-[#8B7E74] leading-relaxed">{prop.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================
   PROFESSIONAL SPOTLIGHT — clean top-pros grid
   ============================================ */
const spotlightPros = providers.slice(0, 3);

function ProfessionalSpotlight() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.spotlight-card').forEach((card, i) => {
        gsap.fromTo(
          card,
          { opacity: 0, y: 40 },
          {
            opacity: 1, y: 0,
            duration: 0.7,
            ease: 'power2.out',
            delay: i * 0.12,
            scrollTrigger: { trigger: card, start: 'top 88%' },
          }
        );
      });
      // Safety net: never leave a card stuck invisible if a trigger misfires.
      gsap.delayedCall(2, () => {
        gsap.utils.toArray<HTMLElement>('.spotlight-card').forEach((el) => {
          if (Number(gsap.getProperty(el, 'opacity')) === 0) gsap.set(el, { opacity: 1, y: 0 });
        });
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 md:py-28"
      style={{ background: 'radial-gradient(900px 520px at 50% 0%, rgba(255,107,53,0.13), transparent 62%), #171717' }}
    >
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#FF6B35] mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35]" /> Top Professionals
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            Meet the Best in <span className="text-[#FF6B35]">Khulna</span>
          </h2>
          <p className="mt-4 text-base text-[rgba(255,255,255,0.55)] max-w-[440px] mx-auto leading-relaxed">
            Verified, top-rated local pros — ready to help right in your neighbourhood.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {spotlightPros.map((pro) => (
            <div key={pro.id} className="spotlight-card h-full">
              <ProfessionalCard provider={pro} className="h-full" />
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/professionals"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#1A1A1A] text-sm font-semibold hover:bg-[#FF6B35] hover:text-white transition-colors"
          >
            View all professionals →
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ============================================
   STATS BAR
   ============================================ */
const stats = [
  { value: '12,000+', label: 'Services Completed' },
  { value: '3,500+', label: 'Active Professionals' },
  { value: '4.8', label: 'Average Rating' },
  { value: '24hr', label: 'Average Response Time' },
];

function StatsBar() {
  const sectionRef = useRef<HTMLElement>(null);
  const numbersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        sectionRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'expo.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 85%' },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="bg-[#FF6B35] py-12">
      <div ref={numbersRef} className="max-w-[1200px] mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="text-3xl md:text-4xl font-bold text-white tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>
              {stat.value}
            </p>
            <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ============================================
   CTA BANNER
   ============================================ */
function CTABanner() {
  return (
    <section className="max-w-[1200px] mx-auto px-6 py-24">
      <div className="bg-[#F3EDE5] rounded-3xl px-8 py-16 md:px-16 flex flex-col md:flex-row items-center gap-12 animate-on-scroll">
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>
            Ready to Get Started?
          </h2>
          <p className="mt-4 text-lg text-[#8B7E74] leading-relaxed">
            Join thousands of happy customers finding trusted local help.
          </p>
          <Link
            to="/services"
            className="inline-block mt-6 px-8 py-3.5 bg-[#1A1A1A] text-white text-sm font-medium rounded-[10px] hover:bg-[#FF6B35] transition-colors duration-200"
          >
            Find a Professional
          </Link>
        </div>
        <div className="flex-shrink-0 relative">
          <div className="flex -space-x-4">
            {['/images/service-cleaning.jpg', '/images/service-plumbing.jpg', '/images/service-photography.jpg'].map((img, i) => (
              <div
                key={img}
                className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden border-4 border-[#F3EDE5]"
                style={{
                  transform: `rotate(${(i - 1) * 5}deg)`,
                  zIndex: 3 - i,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                }}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================
   HOME PAGE
   ============================================ */
export default function Home() {
  const containerRef = useScrollAnimation();

  return (
    <div ref={containerRef} className="page-enter">
      <HeroSection />
      <CategoryMarquee />
      <div id="how-it-works">
        <HowItWorksSection />
      </div>
      <FeaturedServicesSection />
      <WhyChooseSection />
      <ProfessionalSpotlight />
      <StatsBar />
      <CTABanner />
    </div>
  );
}
