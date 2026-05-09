import { Hero } from "@/components/sections/hero";
import { ProblemIndex } from "@/components/sections/problem-index";
import { SelectedBuilds } from "@/components/sections/selected-builds";
import { OriginStatus } from "@/components/sections/origin-status";
import { Contact } from "@/components/sections/contact";
import { ScrollJourney } from "@/components/sections/scroll-journey";

export default function Home() {
  return (
    <div className="flex flex-col bg-nd-black font-body selection:bg-nd-text-display selection:text-nd-black">
      <ScrollJourney>
        <Hero />
        <ProblemIndex />
        <SelectedBuilds />
        <OriginStatus />
        <Contact />
      </ScrollJourney>
    </div>
  );
}
