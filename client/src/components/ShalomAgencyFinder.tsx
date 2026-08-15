import { ExternalLink, MapPin } from "lucide-react";
import { useEffect, useState } from "react";

export type ShalomAgency = { name: string; address: string };

export function ShalomAgencyFinder({ district, selected, onSelect }: { district: string; selected: ShalomAgency | null; onSelect: (agency: ShalomAgency | null) => void }) {
  const [agencyName, setAgencyName] = useState(selected?.name ?? "");
  const [agencyAddress, setAgencyAddress] = useState(selected?.address ?? "");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!selected) return;
    setAgencyName(selected.name);
    setAgencyAddress(selected.address);
  }, [selected]);

  const openOfficialDirectory = () => {
    window.open("https://shalom.com.pe/agencias/aereo", "_blank", "noopener,noreferrer");
    const place = district.trim() || "tu distrito";
    setMessage(`Se abrió el buscador oficial de Shalom. Busca ${place} y vuelve para copiar la agencia elegida.`);
  };

  const saveAgency = () => {
    const name = agencyName.trim();
    const address = agencyAddress.trim();
    if (!name || !address) {
      setMessage("Ingresa el nombre y la dirección exacta de la agencia que elegiste en Shalom.");
      return;
    }
    onSelect({ name, address });
    setMessage("Agencia guardada para coordinar el envío.");
  };

  return <section className="border border-[#deded7] bg-[#fffdfa] p-4"><div className="flex items-start gap-2"><MapPin className="mt-0.5 shrink-0 text-[#d89542]" size={17} /><div><p className="text-sm font-bold">Agencia Shalom para tu envío</p><p className="mt-1 text-xs leading-relaxed text-ink/60">Opcional: consulta los puntos reales en Shalom y guarda la agencia que prefieras.</p></div></div><div className="mt-4 rounded-sm border border-[#deded7] bg-white p-3"><p className="text-xs leading-relaxed text-ink/70">El directorio oficial se abrirá en otra pestaña. Busca <strong>{district.trim() || "tu distrito"}</strong>, elige una agencia y vuelve a esta compra.</p><button type="button" onClick={openOfficialDirectory} className="memphis-button mt-3 w-full bg-[#e5362c] text-white"><ExternalLink size={15} /> Buscar agencias oficiales de Shalom</button></div><div className="mt-4 grid gap-2"><label className="text-xs font-bold uppercase tracking-[.08em] text-ink/70">Agencia elegida</label><input value={agencyName} onChange={event => setAgencyName(event.target.value)} placeholder="Ej. Av. Túpac Amaru Km. 23.5" className="form-input" /><label className="mt-1 text-xs font-bold uppercase tracking-[.08em] text-ink/70">Dirección de la agencia</label><input value={agencyAddress} onChange={event => setAgencyAddress(event.target.value)} placeholder="Copia la dirección mostrada por Shalom" className="form-input" /><button type="button" onClick={saveAgency} className="memphis-button mt-2 bg-[#101824] text-white">Guardar agencia para este envío</button></div>{message && <p role="status" className="mt-3 text-xs leading-relaxed text-ink/60">{message}</p>}{selected && <p className="mt-4 border-t border-[#deded7] pt-3 text-xs leading-relaxed text-ink/70">Agencia seleccionada: <strong>{selected.name}</strong><br />{selected.address}<button type="button" onClick={() => { onSelect(null); setAgencyName(""); setAgencyAddress(""); setMessage(""); }} className="ml-2 underline">Quitar</button></p>}</section>;
}
