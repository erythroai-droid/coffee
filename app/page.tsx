'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Preloader from '@/components/Preloader';
import ScrollTop from '@/components/ScrollTop';
import AiChat from '@/components/AiChat';
import StudioBar from '@/components/StudioBar';
import Film from '@/components/Film';
import Metrics from '@/components/Metrics';
import { Contact, Gallery, Rails } from '@/components/Scenes';
import { Finale, Hero, Menu, Milk, Origin, Ritual } from '@/components/Coffee';
import { SmoothScroll, ScrollTrigger, useScrollReady } from '@/lib/scroll';
import { usePager } from '@/lib/pager';

/**
 * Layout of the reference: one film fixed behind the page, scrubbed by the scroll; the scenes scroll over it in normal flow
 * and hand over to each other; the contact block finally slides over the last frame.
 */
export default function Page() {
  const [pct, setPct] = useState(0);
  const [active, setActive] = useState(0);
  // no blocking preloader where ad traffic lands (phones / tablets) or on a restored scroll: the first frame paints at once,
  // the rest of the film streams in behind the page. Desktop keeps the short preloader (a coarse pass of the frames).
  useEffect(() => { if (window.scrollY > 300 || window.matchMedia('(max-width: 900px)').matches) setPct(100); }, []);
  return (
    <>
      <Preloader pct={pct} />
      <Metrics />
      <Film onLoadProgress={(v) => setPct((p) => Math.max(p, v))} onScene={setActive} />
      <Header />
      <Rails active={active} />
      <ScrollTop />
      <AiChat />
      <StudioBar />
      <SmoothScroll><Content active={active} /></SmoothScroll>
    </>
  );
}

function Content({ active }: { active: number }) {
  const ready = useScrollReady();
  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(() => ScrollTrigger.refresh(), 600);   // fonts / late layout
    return () => clearTimeout(id);
  }, [ready]);
  usePager(ready);
  return (
    <main>
      <Hero />
      <Origin />
      <Milk />
      <Ritual />
      <Finale active={active} />
      <Menu />
      <Gallery />
      <Contact />
    </main>
  );
}
