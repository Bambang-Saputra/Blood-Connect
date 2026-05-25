"use client";

import { useMemo } from "react";
import { PROVINCES, CITIES, citiesByProvince, cityInfo } from "./regions";

/**
 * Cascading dropdown Provinsi → Kota.
 * Otomatis set province + zone berdasarkan city yang dipilih.
 */

interface Props {
  province: string;
  city: string;
  onChange: (val: { province: string; city: string; zone: string }) => void;
  required?: boolean;
}

export function RegionPicker({ province, city, onChange, required }: Props) {
  const cities = useMemo(() => (province ? citiesByProvince(province) : []), [province]);

  function handleProvinceChange(p: string) {
    onChange({ province: p, city: "", zone: "" });
  }

  function handleCityChange(c: string) {
    const info = cityInfo(c);
    onChange({
      province: info?.province ?? province,
      city: c,
      zone: info?.zone ?? "",
    });
  }

  return (
    <>
      <div>
        <label className="block text-sm font-medium mb-1">Provinsi {required && <span className="text-red-500">*</span>}</label>
        <select
          value={province}
          onChange={(e) => handleProvinceChange(e.target.value)}
          className="w-full border border-slate-300 px-3 py-2 rounded"
          required={required}
        >
          <option value="">— Pilih Provinsi —</option>
          {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Kota/Kabupaten {required && <span className="text-red-500">*</span>}</label>
        <select
          value={city}
          onChange={(e) => handleCityChange(e.target.value)}
          className="w-full border border-slate-300 px-3 py-2 rounded disabled:bg-slate-100"
          required={required}
          disabled={!province}
        >
          <option value="">— Pilih Kota —</option>
          {cities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        {city && cityInfo(city)?.zone && (
          <p className="text-xs text-slate-500 mt-1">Zona: <span className="font-medium">{cityInfo(city)?.zone}</span></p>
        )}
      </div>
    </>
  );
}
