"use client";

import { useState, useTransition, type ReactNode } from "react";
import {
  analizarCircular,
  analizarLista,
  guardarFuentes,
  type AnalisisCircular,
  type AnalisisLista,
  type NuevasFuentes,
} from "@/app/presupuestos/actions";
import { formatPct, formatPesos } from "@/lib/presupuestos/calculo";
import type { Fuente, Fuentes } from "@/lib/presupuestos/fuentes";
import type { Vehiculo } from "@/lib/presupuestos/lista";
import type { Producto } from "@/lib/presupuestos/productos";
import { Card, buttonStyles } from "./ui";

export type FuentesElegidas = {
  circular: { nombre: string; productos: Producto[] };
  lista: { nombre: string; vehiculos: Vehiculo[] };
};

type Modo = "misma" | "nueva";

const fecha = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeZone: "America/Argentina/Buenos_Aires" });

function describir(fuente: Fuente<unknown>) {
  if (!fuente.cargadaEn) return `${fuente.nombre} (incluida en la app)`;
  return `${fuente.nombre} · cargada el ${fecha.format(new Date(fuente.cargadaEn))}`;
}

export function PresupuestoFuentes({ fuentes, onListo }: { fuentes: Fuentes; onListo: (f: FuentesElegidas) => void }) {
  const [modoCircular, setModoCircular] = useState<Modo>("misma");
  const [modoLista, setModoLista] = useState<Modo>("misma");
  const [circular, setCircular] = useState<AnalisisCircular | null>(null);
  const [lista, setLista] = useState<AnalisisLista | null>(null);
  const [hoja, setHoja] = useState("");
  const [leyendo, setLeyendo] = useState<"circular" | "lista" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, startGuardar] = useTransition();

  const hojaElegida = lista?.ok ? lista.hojas.find((h) => h.nombre === hoja) : undefined;
  const circularLista = modoCircular === "misma" || circular?.ok === true;
  const listaLista = modoLista === "misma" || hojaElegida !== undefined;

  async function leer(tipo: "circular" | "lista", archivo: File | undefined) {
    if (tipo === "circular") setCircular(null);
    else setLista(null);
    if (!archivo) return;
    const formData = new FormData();
    formData.set("archivo", archivo);
    setLeyendo(tipo);
    try {
      if (tipo === "circular") {
        setCircular(await analizarCircular(formData));
      } else {
        const r = await analizarLista(formData);
        setLista(r);
        if (r.ok) setHoja(r.sugerida);
      }
    } catch {
      const error = { ok: false as const, error: "No se pudo subir el archivo. Probá de nuevo." };
      if (tipo === "circular") setCircular(error);
      else setLista(error);
    } finally {
      setLeyendo(null);
    }
  }

  function continuar() {
    const nuevas: NuevasFuentes = {};
    if (modoCircular === "nueva" && circular?.ok) {
      nuevas.circular = { nombre: circular.nombre, archivo: circular.archivo, productos: circular.productos };
    }
    if (modoLista === "nueva" && lista?.ok && hojaElegida) {
      nuevas.lista = { nombre: hojaElegida.nombre.trim(), archivo: lista.archivo, vehiculos: hojaElegida.vehiculos };
    }
    const elegidas: FuentesElegidas = {
      circular: nuevas.circular ?? { nombre: fuentes.circular.nombre, productos: fuentes.circular.datos },
      lista: nuevas.lista ?? { nombre: fuentes.lista.nombre, vehiculos: fuentes.lista.datos },
    };
    setError(null);
    startGuardar(async () => {
      if (nuevas.circular || nuevas.lista) {
        const r = await guardarFuentes(nuevas);
        if (r.error) {
          setError(r.error);
          return;
        }
      }
      onListo(elegidas);
    });
  }

  return (
    <Card>
      <h2 className="text-sm font-semibold text-slate-500">Circular FCA y lista de precios</h2>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <Bloque
          titulo="Circular comercial FCA"
          vigente={describir(fuentes.circular)}
          modo={modoCircular}
          onModo={setModoCircular}
          accept=".pdf,application/pdf"
          leyendo={leyendo === "circular"}
          onArchivo={(f) => leer("circular", f)}
        >
          {circular && !circular.ok && <Error texto={circular.error} />}
          {circular?.ok && <ResumenCircular nombre={circular.nombre} productos={circular.productos} />}
        </Bloque>

        <Bloque
          titulo="Lista de precios"
          vigente={describir(fuentes.lista)}
          modo={modoLista}
          onModo={setModoLista}
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          leyendo={leyendo === "lista"}
          onArchivo={(f) => leer("lista", f)}
        >
          {lista && !lista.ok && <Error texto={lista.error} />}
          {lista?.ok && (
            <>
              <label className="mt-3 block text-sm font-medium">
                Hoja
                <select
                  value={hoja}
                  onChange={(e) => setHoja(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base shadow-sm md:text-sm"
                >
                  {lista.hojas.map((h) => (
                    <option key={h.nombre} value={h.nombre}>
                      {h.nombre.trim()}
                      {h.nombre === lista.sugerida ? " (sugerida)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              {hojaElegida && <ResumenLista vehiculos={hojaElegida.vehiculos} />}
            </>
          )}
        </Bloque>
      </div>

      {error && <Error texto={error} />}
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          className={buttonStyles.primary}
          disabled={!circularLista || !listaLista || leyendo !== null || guardando}
          onClick={continuar}
        >
          {guardando ? "Guardando…" : "Continuar"}
        </button>
      </div>
    </Card>
  );
}

function Bloque({
  titulo,
  vigente,
  modo,
  onModo,
  accept,
  leyendo,
  onArchivo,
  children,
}: {
  titulo: string;
  vigente: string;
  modo: Modo;
  onModo: (m: Modo) => void;
  accept: string;
  leyendo: boolean;
  onArchivo: (f: File | undefined) => void;
  children: ReactNode;
}) {
  return (
    <fieldset className="rounded-xl border border-slate-200 p-4">
      <legend className="px-1 text-sm font-semibold">{titulo}</legend>
      <label className="flex items-start gap-2 text-sm">
        <input type="radio" checked={modo === "misma"} onChange={() => onModo("misma")} className="mt-0.5 size-4 accent-slate-900" />
        <span>
          <span className="font-medium">Usar la misma de siempre</span>
          <span className="block text-xs text-slate-500">{vigente}</span>
        </span>
      </label>
      <label className="mt-2 flex items-start gap-2 text-sm">
        <input type="radio" checked={modo === "nueva"} onChange={() => onModo("nueva")} className="mt-0.5 size-4 accent-slate-900" />
        <span className="font-medium">Adjuntar una nueva</span>
      </label>
      {modo === "nueva" && (
        <div className="mt-3">
          <input
            type="file"
            accept={accept}
            onChange={(e) => onArchivo(e.target.files?.[0])}
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
          />
          {leyendo && <p className="mt-2 text-sm text-slate-500">Leyendo archivo…</p>}
          {children}
        </div>
      )}
    </fieldset>
  );
}

function Error({ texto }: { texto: string }) {
  return <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{texto}</p>;
}

function ResumenCircular({ nombre, productos }: { nombre: string; productos: Producto[] }) {
  return (
    <details className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900" open>
      <summary className="cursor-pointer font-medium">
        {nombre}: {productos.length} productos leídos
      </summary>
      <p className="mt-1 text-xs">Revisá que coincida con la circular antes de continuar.</p>
      <ul className="mt-2 space-y-1.5 text-xs">
        {productos.map((p) => (
          <li key={p.id}>
            <span className="font-semibold">{p.nombre}</span>
            {p.tope !== null && <> · máx. {formatPesos(p.tope)}</>}
            <br />
            {p.plazos.map((pl) => `${pl.meses}m ${formatPct(pl.tna)} (CE ${formatPct(pl.aporteCE)}, $${pl.coeficiente.toLocaleString("es-AR")})`).join(" · ")}
          </li>
        ))}
      </ul>
    </details>
  );
}

function ResumenLista({ vehiculos }: { vehiculos: Vehiculo[] }) {
  return (
    <details className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900" open>
      <summary className="cursor-pointer font-medium">{vehiculos.length} modelos leídos</summary>
      <div className="mt-2 max-h-56 overflow-auto">
        <table className="w-full text-xs tabular-nums">
          <thead className="text-left">
            <tr>
              <th className="py-1 pr-2 font-medium">Modelo</th>
              <th className="py-1 pr-2 text-right font-medium">Oficial</th>
              <th className="py-1 text-right font-medium">Taraborelli</th>
            </tr>
          </thead>
          <tbody>
            {vehiculos.map((v, i) => (
              <tr key={`${v.codigo}-${i}`}>
                <td className="py-0.5 pr-2">{v.modelo}</td>
                <td className="py-0.5 pr-2 text-right">{formatPesos(v.precioOficial)}</td>
                <td className="py-0.5 text-right">{formatPesos(v.precioTaraborelli)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
