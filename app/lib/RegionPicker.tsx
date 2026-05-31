"use client";

import { useState, useMemo, Fragment } from "react";
import { Combobox, Transition } from "@headlessui/react";
import {
  PROVINCES, citiesByProvince, cityInfo,
  searchProvinces, searchCities,
} from "./regions";

/**
 * Cascading typeable dropdown: Provinsi → Kota.
 *
 * UX:
 *   - User bisa ngetik untuk filter (fuzzy match: "jkt" → "Jakarta")
 *   - Pakai Headless UI Combobox — keyboard nav + a11y built-in
 *   - Submit harus pilih dari list (whitelist) untuk konsistensi data
 *   - City dropdown disabled sampai Provinsi dipilih
 *
 * Konsistensi: kalau user input ga match item manapun, value ga di-set.
 * Saat parent submit, validate-nya tetap di parent / backend Zod schema.
 */

interface Props {
  province: string;
  city: string;
  onChange: (val: { province: string; city: string; zone: string }) => void;
  required?: boolean;
}

export function RegionPicker({ province, city, onChange, required }: Props) {
  const [provinceQuery, setProvinceQuery] = useState("");
  const [cityQuery, setCityQuery] = useState("");

  const filteredProvinces = useMemo(
    () => searchProvinces(provinceQuery),
    [provinceQuery]
  );

  const filteredCities = useMemo(
    () => (province ? searchCities(cityQuery, province) : []),
    [cityQuery, province]
  );

  function handleProvinceChange(p: string | null) {
    if (!p) return;
    onChange({ province: p, city: "", zone: "" });
    setProvinceQuery("");
    setCityQuery("");
  }

  function handleCityChange(c: string | null) {
    if (!c) return;
    const info = cityInfo(c);
    onChange({
      province: info?.province ?? province,
      city: c,
      zone: info?.zone ?? "",
    });
    setCityQuery("");
  }

  return (
    <>
      {/* ===== Provinsi ===== */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Provinsi {required && <span className="text-red-500">*</span>}
        </label>
        <Combobox value={province} onChange={handleProvinceChange}>
          <div className="relative">
            <Combobox.Input
              className="w-full border border-slate-300 px-3 py-2 rounded bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
              placeholder="Cari provinsi… (mis. 'jaba' / 'sumut')"
              displayValue={(v: string) => v}
              onChange={(e) => setProvinceQuery(e.target.value)}
              required={required}
              autoComplete="off"
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400">
              ▾
            </Combobox.Button>
            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
              afterLeave={() => setProvinceQuery("")}
            >
              <Combobox.Options className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white border border-slate-200 py-1 text-sm shadow-lg focus:outline-none">
                {filteredProvinces.length === 0 ? (
                  <div className="px-3 py-2 text-slate-400 italic">
                    Provinsi tidak ditemukan.
                  </div>
                ) : (
                  filteredProvinces.map((p) => (
                    <Combobox.Option
                      key={p}
                      value={p}
                      className={({ active, selected }) =>
                        `cursor-pointer select-none px-3 py-2 ${
                          active ? "bg-red-50 text-red-900" : "text-slate-900"
                        } ${selected ? "font-semibold" : ""}`
                      }
                    >
                      {({ selected }) => (
                        <span className="flex items-center gap-2">
                          {selected && <span className="text-red-500">✓</span>}
                          {p}
                        </span>
                      )}
                    </Combobox.Option>
                  ))
                )}
              </Combobox.Options>
            </Transition>
          </div>
        </Combobox>
      </div>

      {/* ===== Kota/Kabupaten ===== */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Kota/Kabupaten {required && <span className="text-red-500">*</span>}
        </label>
        <Combobox value={city} onChange={handleCityChange} disabled={!province}>
          <div className="relative">
            <Combobox.Input
              className="w-full border border-slate-300 px-3 py-2 rounded bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition disabled:bg-slate-100 disabled:cursor-not-allowed"
              placeholder={province ? "Cari kota/kabupaten…" : "Pilih provinsi dulu"}
              displayValue={(v: string) => v}
              onChange={(e) => setCityQuery(e.target.value)}
              required={required}
              autoComplete="off"
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 disabled:cursor-not-allowed">
              ▾
            </Combobox.Button>
            {province && (
              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
                afterLeave={() => setCityQuery("")}
              >
                <Combobox.Options className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white border border-slate-200 py-1 text-sm shadow-lg focus:outline-none">
                  {filteredCities.length === 0 ? (
                    <div className="px-3 py-2 text-slate-400 italic">
                      <p>Kota tidak ditemukan di {province}.</p>
                      <p className="text-[10px] mt-1">
                        Coba ketik ulang atau pilih kabupaten terdekat.
                      </p>
                    </div>
                  ) : (
                    filteredCities.map((c) => (
                      <Combobox.Option
                        key={c.name}
                        value={c.name}
                        className={({ active, selected }) =>
                          `cursor-pointer select-none px-3 py-2 ${
                            active ? "bg-red-50 text-red-900" : "text-slate-900"
                          } ${selected ? "font-semibold" : ""}`
                        }
                      >
                        {({ selected }) => (
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-2">
                              {selected && <span className="text-red-500">✓</span>}
                              {c.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {c.zone}
                            </span>
                          </div>
                        )}
                      </Combobox.Option>
                    ))
                  )}
                </Combobox.Options>
              </Transition>
            )}
          </div>
        </Combobox>
        {city && cityInfo(city)?.zone && (
          <p className="text-xs text-slate-500 mt-1">
            Zona: <span className="font-medium">{cityInfo(city)?.zone}</span>
          </p>
        )}
      </div>
    </>
  );
}
