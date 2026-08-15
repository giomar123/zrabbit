import { MapView } from "@/components/Map";
import { MapPin, Search } from "lucide-react";
import { useRef, useState } from "react";

export type ShalomAgency = { name: string; address: string };

export function ShalomAgencyFinder({ district, selected, onSelect }: { district: string; selected: ShalomAgency | null; onSelect: (agency: ShalomAgency | null) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(district);
  const [agencies, setAgencies] = useState<ShalomAgency[]>([]);
  const [message, setMessage] = useState("");
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRefs = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  const search = () => {
    const map = mapRef.current;
    const locationQuery = query.trim();
    if (!map || !locationQuery || !window.google) { setMessage("Escribe un distrito o dirección para buscar agencias cercanas."); return; }
    setMessage("Buscando agencias Shalom cercanas…"); setAgencies([]); markerRefs.current.forEach(marker => marker.map = null); markerRefs.current = [];
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: `${locationQuery}, Perú` }, (geocoded, status) => {
      if (status !== "OK" || !geocoded?.[0]?.geometry.location) { setMessage("No ubicamos esa dirección. Prueba con distrito y ciudad."); return; }
      const center = geocoded[0].geometry.location; map.setCenter(center); map.setZoom(13);
      const service = new window.google.maps.places.PlacesService(map);
      service.textSearch({ query: `Shalom ${locationQuery} Perú`, location: center, radius: 25000 }, (places, placeStatus) => {
        if (placeStatus !== window.google.maps.places.PlacesServiceStatus.OK || !places?.length) { setMessage("No encontramos agencias en el mapa. Puedes consultarlas directamente en Shalom."); return; }
        const found = places.slice(0, 5).flatMap(place => place.name && place.formatted_address ? [{ name: place.name, address: place.formatted_address }] : []);
        setAgencies(found); setMessage(found.length ? "Selecciona la agencia que prefieras. Verifica su horario en Shalom antes de ir." : "No encontramos agencias con datos completos.");
        places.slice(0, 5).forEach(place => { if (place.geometry?.location) markerRefs.current.push(new window.google.maps.marker.AdvancedMarkerElement({ map, position: place.geometry.location, title: place.name })); });
      });
    });
  };

  return <section className="border border-[#deded7] bg-[#fffdfa] p-4"><div className="flex items-start gap-2"><MapPin className="mt-0.5 shrink-0 text-[#d89542]" size={17} /><div><p className="text-sm font-bold">Agencia Shalom cercana</p><p className="mt-1 text-xs leading-relaxed text-ink/60">Opcional: consulta agencias próximas y guarda la que elijas para coordinar tu envío.</p></div></div><div className="mt-4 flex gap-2"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Distrito o dirección, ej. Miraflores" className="form-input min-w-0 flex-1" /><button type="button" onClick={() => isOpen ? search() : setIsOpen(true)} className="memphis-button shrink-0 bg-[#101824] text-white"><Search size={15} /> Buscar</button></div>{isOpen && <div className="mt-4"><MapView initialCenter={{ lat: -12.0464, lng: -77.0428 }} initialZoom={11} className="h-64 border border-[#deded7]" onMapReady={map => { mapRef.current = map; window.setTimeout(search, 0); }} /><p className="mt-3 text-xs leading-relaxed text-ink/60">{message}</p>{agencies.length > 0 && <div className="mt-3 grid gap-2">{agencies.map(agency => <button key={`${agency.name}-${agency.address}`} type="button" onClick={() => onSelect(agency)} className={`border p-3 text-left text-sm transition-colors ${selected?.address === agency.address ? "border-[#d89542] bg-[#fff6e8]" : "border-[#deded7] bg-white hover:border-[#d89542]"}`}><strong>{agency.name}</strong><span className="mt-1 block text-xs leading-relaxed text-ink/60">{agency.address}</span></button>)}</div>}<a className="mt-4 inline-block text-xs font-bold uppercase tracking-[.1em] underline underline-offset-4" href="https://agencias.shalom.pe/" target="_blank" rel="noreferrer">Ver directorio oficial de Shalom</a></div>}{selected && <p className="mt-4 border-t border-[#deded7] pt-3 text-xs leading-relaxed text-ink/70">Agencia seleccionada: <strong>{selected.name}</strong><br />{selected.address}<button type="button" onClick={() => onSelect(null)} className="ml-2 underline">Quitar</button></p>}</section>;
}
