/**
 * Data wilayah Indonesia — 38 Provinsi + ~150 Kota/Kabupaten utama
 * (dipersingkat dari data BPS — fokus ke kota besar yang relevan untuk MVP)
 *
 * Dipakai untuk dropdown register & matching MatchSystem.
 */

export interface City {
  name: string;
  province: string;
  zone: string; // regional zone untuk matching loose
}

export const PROVINCES = [
  "Aceh", "Sumatera Utara", "Sumatera Barat", "Riau", "Kepulauan Riau",
  "Jambi", "Bengkulu", "Sumatera Selatan", "Bangka Belitung", "Lampung",
  "DKI Jakarta", "Jawa Barat", "Banten", "Jawa Tengah", "DI Yogyakarta",
  "Jawa Timur", "Bali", "Nusa Tenggara Barat", "Nusa Tenggara Timur",
  "Kalimantan Barat", "Kalimantan Tengah", "Kalimantan Selatan",
  "Kalimantan Timur", "Kalimantan Utara",
  "Sulawesi Utara", "Gorontalo", "Sulawesi Tengah", "Sulawesi Barat",
  "Sulawesi Selatan", "Sulawesi Tenggara",
  "Maluku", "Maluku Utara", "Papua", "Papua Barat", "Papua Tengah",
  "Papua Pegunungan", "Papua Selatan", "Papua Barat Daya",
] as const;

export const CITIES: City[] = [
  // === DKI Jakarta + Jabodetabek (zone) ===
  { name: "Jakarta Pusat", province: "DKI Jakarta", zone: "Jabodetabek" },
  { name: "Jakarta Utara", province: "DKI Jakarta", zone: "Jabodetabek" },
  { name: "Jakarta Selatan", province: "DKI Jakarta", zone: "Jabodetabek" },
  { name: "Jakarta Barat", province: "DKI Jakarta", zone: "Jabodetabek" },
  { name: "Jakarta Timur", province: "DKI Jakarta", zone: "Jabodetabek" },
  { name: "Jakarta", province: "DKI Jakarta", zone: "Jabodetabek" },
  { name: "Bogor", province: "Jawa Barat", zone: "Jabodetabek" },
  { name: "Depok", province: "Jawa Barat", zone: "Jabodetabek" },
  { name: "Tangerang", province: "Banten", zone: "Jabodetabek" },
  { name: "Tangerang Selatan", province: "Banten", zone: "Jabodetabek" },
  { name: "Bekasi", province: "Jawa Barat", zone: "Jabodetabek" },

  // === Jawa Barat ===
  { name: "Bandung", province: "Jawa Barat", zone: "Bandung Raya" },
  { name: "Cimahi", province: "Jawa Barat", zone: "Bandung Raya" },
  { name: "Cirebon", province: "Jawa Barat", zone: "Cirebon" },
  { name: "Sukabumi", province: "Jawa Barat", zone: "Sukabumi" },
  { name: "Tasikmalaya", province: "Jawa Barat", zone: "Priangan Timur" },
  { name: "Garut", province: "Jawa Barat", zone: "Priangan Timur" },

  // === Banten ===
  { name: "Serang", province: "Banten", zone: "Banten" },
  { name: "Cilegon", province: "Banten", zone: "Banten" },

  // === Jawa Tengah ===
  { name: "Semarang", province: "Jawa Tengah", zone: "Semarang Raya" },
  { name: "Solo", province: "Jawa Tengah", zone: "Solo Raya" },
  { name: "Surakarta", province: "Jawa Tengah", zone: "Solo Raya" },
  { name: "Magelang", province: "Jawa Tengah", zone: "Kedu" },
  { name: "Salatiga", province: "Jawa Tengah", zone: "Semarang Raya" },
  { name: "Pekalongan", province: "Jawa Tengah", zone: "Pantura" },
  { name: "Tegal", province: "Jawa Tengah", zone: "Pantura" },
  { name: "Purwokerto", province: "Jawa Tengah", zone: "Banyumas" },

  // === DI Yogyakarta ===
  { name: "Yogyakarta", province: "DI Yogyakarta", zone: "Yogyakarta" },
  { name: "Sleman", province: "DI Yogyakarta", zone: "Yogyakarta" },
  { name: "Bantul", province: "DI Yogyakarta", zone: "Yogyakarta" },

  // === Jawa Timur ===
  { name: "Surabaya", province: "Jawa Timur", zone: "Gerbangkertosusila" },
  { name: "Sidoarjo", province: "Jawa Timur", zone: "Gerbangkertosusila" },
  { name: "Gresik", province: "Jawa Timur", zone: "Gerbangkertosusila" },
  { name: "Malang", province: "Jawa Timur", zone: "Malang Raya" },
  { name: "Batu", province: "Jawa Timur", zone: "Malang Raya" },
  { name: "Kediri", province: "Jawa Timur", zone: "Kediri" },
  { name: "Madiun", province: "Jawa Timur", zone: "Madiun" },
  { name: "Mojokerto", province: "Jawa Timur", zone: "Gerbangkertosusila" },
  { name: "Jember", province: "Jawa Timur", zone: "Tapal Kuda" },
  { name: "Banyuwangi", province: "Jawa Timur", zone: "Tapal Kuda" },
  { name: "Probolinggo", province: "Jawa Timur", zone: "Tapal Kuda" },
  { name: "Pasuruan", province: "Jawa Timur", zone: "Gerbangkertosusila" },

  // === Bali ===
  { name: "Denpasar", province: "Bali", zone: "Bali Selatan" },
  { name: "Badung", province: "Bali", zone: "Bali Selatan" },
  { name: "Gianyar", province: "Bali", zone: "Bali Selatan" },
  { name: "Singaraja", province: "Bali", zone: "Bali Utara" },

  // === Sumatera Utara ===
  { name: "Medan", province: "Sumatera Utara", zone: "Mebidangro" },
  { name: "Binjai", province: "Sumatera Utara", zone: "Mebidangro" },
  { name: "Pematang Siantar", province: "Sumatera Utara", zone: "Sumut Tengah" },
  { name: "Tebing Tinggi", province: "Sumatera Utara", zone: "Mebidangro" },

  // === Aceh ===
  { name: "Banda Aceh", province: "Aceh", zone: "Aceh" },
  { name: "Lhokseumawe", province: "Aceh", zone: "Aceh" },

  // === Sumatera Barat ===
  { name: "Padang", province: "Sumatera Barat", zone: "Sumbar" },
  { name: "Bukittinggi", province: "Sumatera Barat", zone: "Sumbar" },
  { name: "Padang Panjang", province: "Sumatera Barat", zone: "Sumbar" },

  // === Riau & Kepri ===
  { name: "Pekanbaru", province: "Riau", zone: "Riau" },
  { name: "Dumai", province: "Riau", zone: "Riau" },
  { name: "Batam", province: "Kepulauan Riau", zone: "Kepri" },
  { name: "Tanjung Pinang", province: "Kepulauan Riau", zone: "Kepri" },

  // === Jambi ===
  { name: "Jambi", province: "Jambi", zone: "Jambi" },

  // === Bengkulu ===
  { name: "Bengkulu", province: "Bengkulu", zone: "Bengkulu" },

  // === Sumatera Selatan ===
  { name: "Palembang", province: "Sumatera Selatan", zone: "Sumsel" },
  { name: "Lubuklinggau", province: "Sumatera Selatan", zone: "Sumsel" },
  { name: "Prabumulih", province: "Sumatera Selatan", zone: "Sumsel" },

  // === Bangka Belitung ===
  { name: "Pangkalpinang", province: "Bangka Belitung", zone: "Babel" },

  // === Lampung ===
  { name: "Bandar Lampung", province: "Lampung", zone: "Lampung" },
  { name: "Metro", province: "Lampung", zone: "Lampung" },

  // === Kalimantan ===
  { name: "Pontianak", province: "Kalimantan Barat", zone: "Kalbar" },
  { name: "Singkawang", province: "Kalimantan Barat", zone: "Kalbar" },
  { name: "Palangka Raya", province: "Kalimantan Tengah", zone: "Kalteng" },
  { name: "Banjarmasin", province: "Kalimantan Selatan", zone: "Kalsel" },
  { name: "Banjarbaru", province: "Kalimantan Selatan", zone: "Kalsel" },
  { name: "Samarinda", province: "Kalimantan Timur", zone: "Kaltim" },
  { name: "Balikpapan", province: "Kalimantan Timur", zone: "Kaltim" },
  { name: "Bontang", province: "Kalimantan Timur", zone: "Kaltim" },
  { name: "Tarakan", province: "Kalimantan Utara", zone: "Kaltara" },

  // === Sulawesi ===
  { name: "Manado", province: "Sulawesi Utara", zone: "Sulut" },
  { name: "Bitung", province: "Sulawesi Utara", zone: "Sulut" },
  { name: "Tomohon", province: "Sulawesi Utara", zone: "Sulut" },
  { name: "Gorontalo", province: "Gorontalo", zone: "Gorontalo" },
  { name: "Palu", province: "Sulawesi Tengah", zone: "Sulteng" },
  { name: "Mamuju", province: "Sulawesi Barat", zone: "Sulbar" },
  { name: "Makassar", province: "Sulawesi Selatan", zone: "Mamminasata" },
  { name: "Parepare", province: "Sulawesi Selatan", zone: "Sulsel" },
  { name: "Palopo", province: "Sulawesi Selatan", zone: "Sulsel" },
  { name: "Kendari", province: "Sulawesi Tenggara", zone: "Sultra" },
  { name: "Bau-Bau", province: "Sulawesi Tenggara", zone: "Sultra" },

  // === Nusa Tenggara ===
  { name: "Mataram", province: "Nusa Tenggara Barat", zone: "NTB" },
  { name: "Bima", province: "Nusa Tenggara Barat", zone: "NTB" },
  { name: "Kupang", province: "Nusa Tenggara Timur", zone: "NTT" },

  // === Maluku ===
  { name: "Ambon", province: "Maluku", zone: "Maluku" },
  { name: "Tual", province: "Maluku", zone: "Maluku" },
  { name: "Ternate", province: "Maluku Utara", zone: "Malut" },
  { name: "Tidore Kepulauan", province: "Maluku Utara", zone: "Malut" },

  // === Papua ===
  { name: "Jayapura", province: "Papua", zone: "Papua" },
  { name: "Manokwari", province: "Papua Barat", zone: "Papua Barat" },
  { name: "Sorong", province: "Papua Barat Daya", zone: "Papua Barat Daya" },
  { name: "Nabire", province: "Papua Tengah", zone: "Papua Tengah" },
  { name: "Wamena", province: "Papua Pegunungan", zone: "Papua Pegunungan" },
  { name: "Merauke", province: "Papua Selatan", zone: "Papua Selatan" },
];

export function citiesByProvince(province: string): City[] {
  return CITIES.filter((c) => c.province === province).sort((a, b) => a.name.localeCompare(b.name));
}

export function cityInfo(name: string): City | undefined {
  return CITIES.find((c) => c.name === name);
}
