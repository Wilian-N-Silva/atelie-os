"use client";

import * as React from "react";
import { Button, Input, cn } from "@/components/ui";
import { MANUAL_GROUPS, MANUAL_SECTIONS, type ManualSection } from "@/screens/manual-content";

function normalizeManualSearch(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function manualValueText(value: unknown): string {
  if (value == null || typeof value === "boolean") return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(manualValueText).join(" ");

  if (React.isValidElement(value)) {
    const props = value.props as Record<string, unknown>;
    return [
      props.children,
      props.label,
      props.head,
      props.rows,
      props.items,
      props.steps,
      props.title,
      props.body,
    ].map(manualValueText).join(" ");
  }

  if (typeof value === "object") return Object.values(value).map(manualValueText).join(" ");

  return "";
}

function sectionMatches(section: ManualSection, query: string) {
  if (!query) return true;
  return normalizeManualSearch(`${section.title} ${section.intro ?? ""} ${manualValueText(section.body)}`).includes(query);
}

export function ManualScreen() {
  const [activeSectionId, setActiveSectionId] = React.useState(MANUAL_SECTIONS[0]?.id ?? "");
  const [query, setQuery] = React.useState("");
  const docRef = React.useRef<HTMLDivElement>(null);

  const search = normalizeManualSearch(query.trim());
  const visibleGroups = React.useMemo(
    () => MANUAL_GROUPS
      .map((group) => ({
        ...group,
        sections: group.sections.filter((section) => sectionMatches(section, search)),
      }))
      .filter((group) => group.sections.length > 0),
    [search],
  );
  const visibleSections = React.useMemo(
    () => MANUAL_SECTIONS.filter((section) => sectionMatches(section, search)),
    [search],
  );

  React.useEffect(() => {
    if (visibleSections.length === 0) return;
    if (!visibleSections.some((section) => section.id === activeSectionId)) {
      setActiveSectionId(visibleSections[0].id);
    }
  }, [activeSectionId, visibleSections]);

  React.useEffect(() => {
    const scroller = document.querySelector(".content");
    if (!scroller || !docRef.current) return;

    const sections = Array.from(docRef.current.querySelectorAll<HTMLElement>("[data-manual-section]"));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const nextSection = visible[0]?.target.getAttribute("data-manual-section");
        if (nextSection) setActiveSectionId(nextSection);
      },
      { root: scroller, rootMargin: "-12% 0px -72% 0px", threshold: 0 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [visibleSections]);

  const jumpToSection = (id: string) => {
    const scroller = document.querySelector<HTMLElement>(".content");
    const section = docRef.current?.querySelector<HTMLElement>(`[data-manual-section="${id}"]`);
    if (!scroller || !section) return;

    const target = section.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 16;
    setActiveSectionId(id);
    scroller.scrollTo({ top: target, behavior: "smooth" });
  };

  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-h1">Manual &amp; ajuda</h1>
          <p className="page-lede">
            Guia de uso do Ateliê OS. Leia do começo ao fim ou vá direto à dúvida.
          </p>
        </div>
        <Button variant="outline" icon="printer" onClick={() => window.print()}>Imprimir guia</Button>
      </div>

      <div className="mn-layout">
        <aside className="mn-toc" aria-label="Indice do manual">
          <Input
            className="mn-toc-search"
            icon="search"
            placeholder="Buscar no manual..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          {visibleGroups.length === 0 && (
            <div className="muted" style={{ fontSize: 13, padding: "8px 11px" }}>
              Nada encontrado para <span>{query}</span>.
            </div>
          )}

          {visibleGroups.map((group) => (
            <div key={group.label}>
              <div className="mn-toc-group">{group.label}</div>
              {group.sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={cn("mn-toc-link", activeSectionId === section.id && "mn-toc-link--on")}
                  onClick={() => jumpToSection(section.id)}
                >
                  <span className="mn-toc-num">{section.num ?? "."}</span>
                  <span>{section.title}</span>
                </button>
              ))}
            </div>
          ))}
        </aside>

        <div className="mn-doc" ref={docRef}>
          {visibleSections.map((section) => (
            <section
              className="mn-section"
              data-manual-section={section.id}
              key={section.id}
            >
              {section.hero ? section.body : (
                <>
                  <div className="mn-sec-head">
                    {section.num && <span className="mn-sec-num">{section.num}</span>}
                    <h2 className="mn-sec-title">{section.title}</h2>
                    {section.intro && <p className="mn-sec-intro">{section.intro}</p>}
                  </div>
                  {section.body}
                </>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
