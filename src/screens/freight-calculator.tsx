"use client";

import * as React from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Icon,
  Input,
  Select,
  Stat,
  toast,
} from "@/components/ui";
import { BRL } from "@/lib/domain";
import { type PackageProfile, type ShippingQuoteService, quoteShipping } from "@/lib/shipping-client";
import type { Go } from "@/lib/types";

function onlyDigits(value: string, max = 32) {
  return value.replace(/\D/g, "").slice(0, max);
}

function maskCep(value: string) {
  const digits = onlyDigits(value, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

function decimalInput(value: string) {
  return value.replace(/[^\d,.]/g, "");
}

function numberValue(value: string, fallback = 0) {
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) ? number : fallback;
}

function quoteMessage(input: {
  destinationZip: string;
  packageName: string;
  service: ShippingQuoteService | null;
  manualPrice: number;
  packagingCost: number;
}) {
  const destination = maskCep(input.destinationZip) || "seu CEP";
  if (input.service) {
    const carrier = input.service.company ? `${input.service.company} - ` : "";
    const deadline = input.service.deliveryTime == null ? "" : ` Prazo estimado: ${input.service.deliveryTime} dia(s).`;
    return `Frete para ${destination}: ${carrier}${input.service.name} por ${BRL(input.service.price)}.${deadline}`;
  }
  const total = input.manualPrice + input.packagingCost;
  return `Frete para ${destination}: pacote ${input.packageName}, valor ${BRL(total)}.`;
}

export function FreightCalculatorScreen({ go }: { go: Go }) {
  const [profiles, setProfiles] = React.useState<PackageProfile[]>([]);
  const [profileId, setProfileId] = React.useState("");
  const [destinationZip, setDestinationZip] = React.useState("");
  const [weightG, setWeightG] = React.useState("500");
  const [lengthCm, setLengthCm] = React.useState("16");
  const [widthCm, setWidthCm] = React.useState("11");
  const [heightCm, setHeightCm] = React.useState("8");
  const [manualPrice, setManualPrice] = React.useState("0");
  const [message, setMessage] = React.useState("");
  const [services, setServices] = React.useState<ShippingQuoteService[]>([]);
  const [selectedServiceId, setSelectedServiceId] = React.useState("");
  const [quoting, setQuoting] = React.useState(false);

  const selectedProfile = profiles.find((profile) => profile.id === profileId) ?? profiles[0] ?? null;
  const selectedService = services.find((service) => service.id === selectedServiceId) ?? services[0] ?? null;
  const packageCost = selectedProfile?.cost ?? 0;

  React.useEffect(() => {
    let alive = true;
    fetch("/api/app/shipping", { cache: "no-store", credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then((payload: { shipping?: { packageProfiles?: PackageProfile[] } } | null) => {
        if (!alive) return;
        const next = payload?.shipping?.packageProfiles?.length ? payload.shipping.packageProfiles : [];
        setProfiles(next);
        const first = next[0];
        if (first) {
          setProfileId(first.id);
          setWeightG(String(first.weightG));
          setLengthCm(String(first.lengthCm));
          setWidthCm(String(first.widthCm));
          setHeightCm(String(first.heightCm));
        }
      })
      .catch(() => null);
    return () => { alive = false; };
  }, []);

  const applyProfile = (id: string) => {
    const profile = profiles.find((item) => item.id === id);
    setProfileId(id);
    if (!profile) return;
    setWeightG(String(profile.weightG));
    setLengthCm(String(profile.lengthCm));
    setWidthCm(String(profile.widthCm));
    setHeightCm(String(profile.heightCm));
  };

  const runQuote = async () => {
    setQuoting(true);
    setServices([]);
    setSelectedServiceId("");
    try {
      const result = await quoteShipping({
        destinationZip: onlyDigits(destinationZip, 8),
        weightG: numberValue(weightG),
        lengthCm: numberValue(lengthCm),
        widthCm: numberValue(widthCm),
        heightCm: numberValue(heightCm),
      });
      const nextServices = result.services ?? [];
      setServices(nextServices);
      setSelectedServiceId(nextServices[0]?.id ?? "");
      setMessage(result.message);
    } catch {
      setMessage("Cotacao indisponivel. Use o valor manual.");
    } finally {
      setQuoting(false);
    }
  };

  const copyMessage = async () => {
    const text = quoteMessage({
      destinationZip,
      packageName: selectedProfile?.name ?? "manual",
      service: selectedService,
      manualPrice: numberValue(manualPrice),
      packagingCost: packageCost,
    });
    try {
      await navigator.clipboard.writeText(text);
      toast("Mensagem copiada.", "ok");
    } catch {
      toast("Nao foi possivel copiar a mensagem.", "bad");
    }
  };

  return (
    <div className="page fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-h1">Frete</h1>
          <p className="page-lede">Calculadora avulsa de pacote e cotacao</p>
        </div>
        <Button variant="outline" icon="settings" onClick={() => go("configuracoes", { tab: "shipping" })}>Configurar pacotes</Button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, .9fr)", gap: "var(--gap)" }}>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Pacote</CardTitle>
              <div className="section-hint" style={{ marginTop: 2 }}>{selectedProfile ? `${selectedProfile.capacity} item(ns) por pacote` : "Sem modelo salvo"}</div>
            </div>
            <Badge tone={selectedProfile ? "ok" : "warn"}>{selectedProfile ? selectedProfile.name : "manual"}</Badge>
          </CardHeader>
          <CardContent>
            <div className="ff-grid">
              <Field label="Modelo">
                <Select
                  value={profileId}
                  onChange={applyProfile}
                  options={profiles.length ? profiles.map((profile) => ({ value: profile.id, label: profile.name })) : [{ value: "", label: "Manual" }]}
                />
              </Field>
              <Field label="CEP destino">
                <Input value={maskCep(destinationZip)} onChange={(event) => setDestinationZip(onlyDigits(event.target.value, 8))} placeholder="00000-000" />
              </Field>
            </div>
            <div className="ff-grid-3">
              <Field label="Peso (g)">
                <Input value={weightG} inputMode="numeric" onChange={(event) => setWeightG(event.target.value.replace(/\D/g, ""))} />
              </Field>
              <Field label="Comprimento">
                <Input value={lengthCm} inputMode="decimal" onChange={(event) => setLengthCm(decimalInput(event.target.value))} />
              </Field>
              <Field label="Largura">
                <Input value={widthCm} inputMode="decimal" onChange={(event) => setWidthCm(decimalInput(event.target.value))} />
              </Field>
            </div>
            <div className="ff-grid">
              <Field label="Altura">
                <Input value={heightCm} inputMode="decimal" onChange={(event) => setHeightCm(decimalInput(event.target.value))} />
              </Field>
              <Field label="Frete manual">
                <Input value={manualPrice} inputMode="decimal" onChange={(event) => setManualPrice(decimalInput(event.target.value))} />
              </Field>
            </div>
            <div className="row-wrap" style={{ gap: 8, marginTop: 12 }}>
              <Button variant="default" icon="truck" disabled={quoting || onlyDigits(destinationZip, 8).length !== 8} onClick={runQuote}>
                {quoting ? "Cotando..." : "Cotar frete"}
              </Button>
              <Button variant="outline" icon="copy" onClick={copyMessage}>Copiar WhatsApp</Button>
            </div>
            {message && <div className="section-hint" style={{ marginTop: 12 }}>{message}</div>}
          </CardContent>
        </Card>

        <div style={{ display: "grid", gap: "var(--gap)" }}>
          <div className="grid cols-2" style={{ gap: 8 }}>
            <Card><CardContent style={{ padding: 12 }}><Stat label="Embalagem" value={BRL(packageCost)} sub={selectedProfile?.name ?? "manual"} /></CardContent></Card>
            <Card><CardContent style={{ padding: 12 }}><Stat label="Manual + pacote" value={BRL(numberValue(manualPrice) + packageCost)} sub={maskCep(destinationZip) || "CEP"} /></CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Cotacoes</CardTitle>
                <div className="section-hint" style={{ marginTop: 2 }}>{services.length ? `${services.length} servico(s)` : "Aguardando consulta"}</div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="shipping-rate-grid">
                {services.map((service) => {
                  const selected = selectedService?.id === service.id;
                  return (
                    <button key={`${service.id}-${service.name}`} type="button" className={`shipping-rate-card ${selected ? "shipping-rate-card--on" : ""}`} onClick={() => setSelectedServiceId(service.id)}>
                      <div>
                        <strong>{service.company ? `${service.company} - ${service.name}` : service.name}</strong>
                        <span>{service.deliveryTime == null ? "Prazo indisponivel" : `Ate ${service.deliveryTime} dia(s)`}</span>
                      </div>
                      <div className="shipping-rate-price">{BRL(service.price)}</div>
                      <Badge tone={selected ? "ok" : "outline"}>{selected ? "selecionado" : "usar"}</Badge>
                    </button>
                  );
                })}
                {!services.length && (
                  <div className="empty-state" style={{ minHeight: 140 }}>
                    <Icon name="truck" size={24} />
                    <strong>Sem cotacao</strong>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
