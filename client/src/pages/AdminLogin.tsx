import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowLeft, LockKeyhole, Rabbit } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";

export default function AdminLogin() {
  const { user, loading } = useAuth(); const [, setLocation] = useLocation();
  useEffect(() => { if (!loading && user?.role === "admin") setLocation("/admin"); }, [loading, user, setLocation]);
  return <main className="grid min-h-screen bg-[#101824] p-5 text-[#fff9ee] sm:place-items-center"><section className="w-full max-w-md"><Link href="/" className="mb-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.13em] text-white/70 hover:text-[#eac28f]"><ArrowLeft size={15} /> Volver a la tienda</Link><div className="border border-white/12 bg-[#172536] p-7 shadow-2xl sm:p-9"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center bg-[#d89542] text-[#101824]"><Rabbit size={24} /></div><div><p className="font-black text-xl tracking-tight">zRabbit</p><p className="text-xs text-white/55">Panel de administración</p></div></div><div className="mt-9"><p className="editorial-label text-[#eac28f]">Acceso seguro</p><h1 className="mt-3 font-serif text-4xl">Bienvenido.</h1><p className="mt-3 text-sm leading-relaxed text-white/65">Accede con la cuenta Google autorizada para administrar zRabbit.</p></div><a href="/api/auth/google/login" className="mt-8 inline-flex w-full items-center justify-center gap-3 bg-white px-4 py-3 text-sm font-bold text-[#172536] transition-colors hover:bg-[#f0eee9]"><span className="grid h-5 w-5 place-items-center rounded-full border border-slate-300 font-sans text-xs font-bold text-[#4285f4]">G</span>Iniciar sesión con Google</a><p className="mt-6 flex items-center gap-2 text-xs leading-relaxed text-white/45"><LockKeyhole size={14} /> Solo la cuenta Google autorizada puede abrir el panel.</p></div></section></main>;
}
