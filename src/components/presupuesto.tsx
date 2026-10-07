"use client";

import { useId, useState } from "react";
import {
  calcularContado,
  calcularFinanciado,
  formatPct,
  formatPesos,
  parsePesos,
  type OpcionFinanciacion,
} from "@/lib/presupuestos/calculo";
import { LISTA_VIGENTE, VEHICULOS, type Vehiculo } from "@/lib/presupuestos/lista";
import { MONTO_MINIMO } from "@/lib/presupuestos/productos";
import { Card, buttonStyles } from "./ui";

type Operacion = "financiada" | "contado";

const inputStyles =
  "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 md:text-sm";

export function Presupuesto() {
  const [operacion, setOperacion] = useState<Operacion | null>(null);
  const [codigoIndex, setCodigoIndex] = useState<string>("");
  const [precio, setPrecio] = useState(0);
  const [anticipo, setAnticipo] = useState(0);
  const [conFyF, setConFyF] = useState(true);
  const [conPatentamiento, setConPatentamiento] = useState(true);

  const vehiculo: Vehiculo | undefined = codigoIndex === "" ? undefined : VEHICULOS[Number(codigoIndex)];

  return (
    <div className="space-y-5">
      <Card>
        <h2 className="text-sm font-semibold text-slate-500">1. Tipo de operación</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {(["financiada", "contado"] as const).map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => setOperacion(op)}
              aria-pressed={operacion === op}
              className="rounded-xl border border-slate-300 bg-white px-4 py-4 text-base font-semibold text-slate-700 hover:border-slate-400 aria-pressed:border-slate-900 aria-pressed:bg-slate-900 aria-pressed:text-white"
            >
              {op === "financiada" ? "Financiada" : "Contado"}
            </button>
          ))}
        </div>
      </Card>

      {operacion && (
        <Card>
          <h2 className="text-sm font-semibold text-slate-500">2. Vehículo y precio</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">
              Vehículo
              <select value={codigoIndex} onChange={(e) => setCodigoIndex(e.target.value)} className={inputStyles}>
                <option value="">Elegí un modelo…</option>
                {VEHICULOS.map((v, i) => (
                  <option key={`${v.codigo}-${i}`} value={i}>
                    {v.modelo}
                  </option>
                ))}
              </select>
            </label>
            <MoneyInput label="Precio Taraborelli" value={precio} onChange={setPrecio} disabled={!vehiculo} />
          </div>

          {vehiculo && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900">
              <span>
                Referencia Precio Taraborelli: <strong className="tabular-nums">{formatPesos(vehiculo.precioTaraborelli)}</strong>
              </span>
              <span className="text-sky-700">Precio Oficial: {formatPesos(vehiculo.precioOficial)}</span>
              <button type="button" onClick={() => setPrecio(vehiculo.precioTaraborelli)} className="font-medium text-sky-700 underline">
                Usar referencia
              </button>
            </div>
          )}
          <p className="mt-2 text-xs text-slate-400">{LISTA_VIGENTE}</p>
        </Card>
      )}

      {operacion === "contado" && vehiculo && precio > 0 && (
        <Contado
          vehiculo={vehiculo}
          precio={precio}
          conFyF={conFyF}
          conPatentamiento={conPatentamiento}
          onFyF={setConFyF}
          onPatentamiento={setConPatentamiento}
        />
      )}

      {operacion === "financiada" && vehiculo && precio > 0 && (
        <Financiada vehiculo={vehiculo} precio={precio} anticipo={anticipo} onAnticipo={setAnticipo} />
      )}
    </div>
  );
}

function MoneyInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <input
        type="text"
        inputMode="numeric"
        placeholder="$ 0"
        disabled={disabled}
        value={value ? formatPesos(value) : ""}
        onChange={(e) => onChange(parsePesos(e.target.value))}
        className={`${inputStyles} tabular-nums disabled:bg-slate-50`}
      />
    </label>
  );
}

function Fila({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 py-1.5 ${strong ? "border-t border-slate-200 pt-2.5 font-semibold" : ""}`}>
      <dt className={strong ? "" : "text-slate-600"}>{label}</dt>
      <dd className="tabular-nums">{formatPesos(value)}</dd>
    </div>
  );
}

function Nota({ texto }: { texto: string }) {
  return <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 italic">{texto}</p>;
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-slate-900" />
      {label}
    </label>
  );
}

function Contado({
  vehiculo,
  precio,
  conFyF,
  conPatentamiento,
  onFyF,
  onPatentamiento,
}: {
  vehiculo: Vehiculo;
  precio: number;
  conFyF: boolean;
  conPatentamiento: boolean;
  onFyF: (v: boolean) => void;
  onPatentamiento: (v: boolean) => void;
}) {
  const r = calcularContado(vehiculo, precio, { fleteFormularios: conFyF, patentamiento: conPatentamiento });
  return (
    <Card>
      <h2 className="text-sm font-semibold text-slate-500">3. Presupuesto de contado</h2>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        <Checkbox label="Flete / Formularios" checked={conFyF} onChange={onFyF} />
        <Checkbox label="Patentamiento" checked={conPatentamiento} onChange={onPatentamiento} />
      </div>
      <h3 className="mt-4 font-semibold">{vehiculo.modelo}</h3>
      <dl className="mt-2 max-w-md text-sm">
        <Fila label="Precio" value={r.precio} />
        {conFyF && <Fila label="Flete / Formularios" value={r.fleteFormularios} />}
        {conPatentamiento && <Fila label="Patentamiento" value={r.patentamiento} />}
        <Fila label={conPatentamiento ? "Total puesto en calle" : conFyF ? "Total contado F+F" : "Total"} value={r.total} strong />
      </dl>
      {r.nota && <Nota texto={r.nota} />}
    </Card>
  );
}

function Financiada({
  vehiculo,
  precio,
  anticipo,
  onAnticipo,
}: {
  vehiculo: Vehiculo;
  precio: number;
  anticipo: number;
  onAnticipo: (n: number) => void;
}) {
  const r = calcularFinanciado(vehiculo, precio, anticipo);
  const promos = r.opciones.filter((o) => o.producto.tipo === "promo");
  const tradicionales = r.opciones.filter((o) => o.producto.tipo === "tradicional");

  return (
    <>
      <Card>
        <h2 className="text-sm font-semibold text-slate-500">3. Precio puesto en calle</h2>
        <h3 className="mt-3 font-semibold">{vehiculo.modelo}</h3>
        <dl className="mt-2 max-w-md text-sm">
          <Fila label="Precio" value={r.precio} />
          <Fila label="Flete / Formularios" value={r.fleteFormularios} />
          <Fila label="Patentamiento" value={r.patentamiento} />
          <Fila label="Total puesto en calle" value={r.puestoEnCalle} strong />
        </dl>
        <div className="mt-4 max-w-md">
          <MoneyInput label="Anticipo del cliente (incluye prenda)" value={anticipo} onChange={onAnticipo} />
          <button type="button" className={`${buttonStyles.secondary} mt-2`} onClick={() => onAnticipo(0)} disabled={!anticipo}>
            Ver mínimos anticipos
          </button>
          <p className="mt-1 text-xs text-slate-500">
            Con anticipo $0 cada plazo muestra el mínimo anticipo (se financia el máximo de cada producto).
          </p>
        </div>
      </Card>

      {r.sinSaldo ? (
        <Card>
          <p className="text-sm">El anticipo cubre el total puesto en calle: no hace falta financiar.</p>
        </Card>
      ) : (
        <>
          <Seccion titulo={anticipo ? "Productos promo FCA" : "Mínimo Anticipo — Productos Promo FCA"} opciones={promos} anticipo={anticipo} />
          <Seccion titulo="Líneas tradicionales" opciones={tradicionales} anticipo={anticipo} />
          <Nota texto={r.nota} />
          <p className="text-xs text-slate-500">
            Cuotas con IVA, sin seguro automotor. En productos UVA la cuota es la inicial y se ajusta por UVA. Monto mínimo a
            financiar {formatPesos(MONTO_MINIMO)}.
          </p>
        </>
      )}
    </>
  );
}

function Seccion({ titulo, opciones, anticipo }: { titulo: string; opciones: OpcionFinanciacion[]; anticipo: number }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">{titulo}</h2>
      {opciones.map((o) => (
        <ProductoCard key={o.producto.id} opcion={o} anticipo={anticipo} />
      ))}
    </section>
  );
}

function ProductoCard({ opcion, anticipo }: { opcion: OpcionFinanciacion; anticipo: number }) {
  const { producto, montoMaximo, plazos } = opcion;
  return (
    <Card className="p-0 md:p-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pt-4 md:px-5">
        <h3 className="font-semibold">
          {producto.nombre}
          {producto.uva && <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">UVA</span>}
        </h3>
        <span className="text-xs text-slate-500">
          Máximo a financiar <strong className="tabular-nums">{formatPesos(montoMaximo)}</strong> · LTV {formatPct(producto.ltv)}
        </span>
      </div>
      {producto.aclaracion && <p className="px-4 text-xs text-slate-500 md:px-5">{producto.aclaracion}</p>}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm tabular-nums">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium md:px-5">Plazo</th>
              <th className="px-2 py-2 font-medium">TNA</th>
              <th className="px-2 py-2 text-right font-medium">Monto a financiar</th>
              <th className="px-2 py-2 text-right font-medium">Diferencia</th>
              <th className="px-2 py-2 text-right font-medium">Prenda</th>
              <th className="px-2 py-2 text-right font-medium">Anticipo</th>
              <th className="px-4 py-2 text-right font-medium md:px-5">Cuota</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {plazos.map((pl) => {
              const sube = pl.anticipoInsuficiente && anticipo > 0;
              return (
                <tr key={pl.meses} className={pl.debajoDelMinimo ? "text-slate-400" : ""}>
                  <td className="px-4 py-2 font-medium md:px-5">{pl.meses} m</td>
                  <td className="px-2 py-2">{formatPct(pl.tna)}</td>
                  <td className="px-2 py-2 text-right">{formatPesos(pl.montoFinanciado)}</td>
                  <td className="px-2 py-2 text-right">{formatPesos(pl.diferencia)}</td>
                  <td className="px-2 py-2 text-right">
                    {formatPesos(pl.prenda)} <span className="text-xs text-slate-400">({formatPct(pl.prendaPct)})</span>
                  </td>
                  <td className={`px-2 py-2 text-right font-medium ${sube ? "text-amber-700" : ""}`} title={sube ? "El anticipo del cliente no alcanza para este producto" : undefined}>
                    {formatPesos(pl.anticipo)}
                    {sube && " ↑"}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold md:px-5">
                    {pl.debajoDelMinimo ? <span className="text-xs font-normal">Menor al mínimo</span> : formatPesos(pl.cuota)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {anticipo > 0 && plazos.some((pl) => pl.anticipoInsuficiente) && (
        <p className="px-4 pt-2 text-xs text-amber-700 md:px-5">↑ El anticipo no alcanza: se financia el máximo y se muestra el anticipo necesario.</p>
      )}
      <div className="h-4" />
    </Card>
  );
}
