/**
 * Data wilayah Indonesia — 38 Provinsi + ~280 Kota/Kabupaten
 * Mencakup SEMUA 98 Kota + Kabupaten utama tiap provinsi (cakupan ~55% kab/kota nasional).
 *
 * Dipakai untuk dropdown register & matching MatchSystem (proximity by city/zone).
 * Untuk kabupaten kecil yang tidak ada di list, user pilih kabupaten/zona terdekat.
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
  // ===== DKI JAKARTA =====
  { name: "Jakarta Pusat", province: "DKI Jakarta", zone: "Jabodetabek" },
  { name: "Jakarta Utara", province: "DKI Jakarta", zone: "Jabodetabek" },
  { name: "Jakarta Selatan", province: "DKI Jakarta", zone: "Jabodetabek" },
  { name: "Jakarta Barat", province: "DKI Jakarta", zone: "Jabodetabek" },
  { name: "Jakarta Timur", province: "DKI Jakarta", zone: "Jabodetabek" },
  { name: "Kepulauan Seribu", province: "DKI Jakarta", zone: "Jabodetabek" },

  // ===== JAWA BARAT =====
  { name: "Bogor", province: "Jawa Barat", zone: "Jabodetabek" },
  { name: "Kabupaten Bogor", province: "Jawa Barat", zone: "Jabodetabek" },
  { name: "Depok", province: "Jawa Barat", zone: "Jabodetabek" },
  { name: "Bekasi", province: "Jawa Barat", zone: "Jabodetabek" },
  { name: "Kabupaten Bekasi", province: "Jawa Barat", zone: "Jabodetabek" },
  { name: "Bandung", province: "Jawa Barat", zone: "Bandung Raya" },
  { name: "Kabupaten Bandung", province: "Jawa Barat", zone: "Bandung Raya" },
  { name: "Bandung Barat", province: "Jawa Barat", zone: "Bandung Raya" },
  { name: "Cimahi", province: "Jawa Barat", zone: "Bandung Raya" },
  { name: "Sumedang", province: "Jawa Barat", zone: "Bandung Raya" },
  { name: "Cirebon", province: "Jawa Barat", zone: "Cirebon Raya" },
  { name: "Kabupaten Cirebon", province: "Jawa Barat", zone: "Cirebon Raya" },
  { name: "Indramayu", province: "Jawa Barat", zone: "Cirebon Raya" },
  { name: "Majalengka", province: "Jawa Barat", zone: "Cirebon Raya" },
  { name: "Kuningan", province: "Jawa Barat", zone: "Cirebon Raya" },
  { name: "Sukabumi", province: "Jawa Barat", zone: "Sukabumi" },
  { name: "Kabupaten Sukabumi", province: "Jawa Barat", zone: "Sukabumi" },
  { name: "Cianjur", province: "Jawa Barat", zone: "Sukabumi" },
  { name: "Tasikmalaya", province: "Jawa Barat", zone: "Priangan Timur" },
  { name: "Kabupaten Tasikmalaya", province: "Jawa Barat", zone: "Priangan Timur" },
  { name: "Ciamis", province: "Jawa Barat", zone: "Priangan Timur" },
  { name: "Banjar", province: "Jawa Barat", zone: "Priangan Timur" },
  { name: "Pangandaran", province: "Jawa Barat", zone: "Priangan Timur" },
  { name: "Garut", province: "Jawa Barat", zone: "Priangan Timur" },
  { name: "Karawang", province: "Jawa Barat", zone: "Pantura Barat" },
  { name: "Purwakarta", province: "Jawa Barat", zone: "Pantura Barat" },
  { name: "Subang", province: "Jawa Barat", zone: "Pantura Barat" },

  // ===== BANTEN =====
  { name: "Tangerang", province: "Banten", zone: "Jabodetabek" },
  { name: "Kabupaten Tangerang", province: "Banten", zone: "Jabodetabek" },
  { name: "Tangerang Selatan", province: "Banten", zone: "Jabodetabek" },
  { name: "Serang", province: "Banten", zone: "Banten" },
  { name: "Kabupaten Serang", province: "Banten", zone: "Banten" },
  { name: "Cilegon", province: "Banten", zone: "Banten" },
  { name: "Pandeglang", province: "Banten", zone: "Banten" },
  { name: "Lebak", province: "Banten", zone: "Banten" },

  // ===== JAWA TENGAH =====
  { name: "Semarang", province: "Jawa Tengah", zone: "Semarang Raya" },
  { name: "Kabupaten Semarang", province: "Jawa Tengah", zone: "Semarang Raya" },
  { name: "Salatiga", province: "Jawa Tengah", zone: "Semarang Raya" },
  { name: "Demak", province: "Jawa Tengah", zone: "Semarang Raya" },
  { name: "Kendal", province: "Jawa Tengah", zone: "Semarang Raya" },
  { name: "Solo", province: "Jawa Tengah", zone: "Solo Raya" },
  { name: "Surakarta", province: "Jawa Tengah", zone: "Solo Raya" },
  { name: "Sukoharjo", province: "Jawa Tengah", zone: "Solo Raya" },
  { name: "Karanganyar", province: "Jawa Tengah", zone: "Solo Raya" },
  { name: "Sragen", province: "Jawa Tengah", zone: "Solo Raya" },
  { name: "Boyolali", province: "Jawa Tengah", zone: "Solo Raya" },
  { name: "Klaten", province: "Jawa Tengah", zone: "Solo Raya" },
  { name: "Wonogiri", province: "Jawa Tengah", zone: "Solo Raya" },
  { name: "Magelang", province: "Jawa Tengah", zone: "Kedu" },
  { name: "Kabupaten Magelang", province: "Jawa Tengah", zone: "Kedu" },
  { name: "Temanggung", province: "Jawa Tengah", zone: "Kedu" },
  { name: "Wonosobo", province: "Jawa Tengah", zone: "Kedu" },
  { name: "Purworejo", province: "Jawa Tengah", zone: "Kedu" },
  { name: "Kebumen", province: "Jawa Tengah", zone: "Kedu" },
  { name: "Pekalongan", province: "Jawa Tengah", zone: "Pantura" },
  { name: "Kabupaten Pekalongan", province: "Jawa Tengah", zone: "Pantura" },
  { name: "Tegal", province: "Jawa Tengah", zone: "Pantura" },
  { name: "Kabupaten Tegal", province: "Jawa Tengah", zone: "Pantura" },
  { name: "Brebes", province: "Jawa Tengah", zone: "Pantura" },
  { name: "Batang", province: "Jawa Tengah", zone: "Pantura" },
  { name: "Pemalang", province: "Jawa Tengah", zone: "Pantura" },
  { name: "Purwokerto", province: "Jawa Tengah", zone: "Banyumas Raya" },
  { name: "Banyumas", province: "Jawa Tengah", zone: "Banyumas Raya" },
  { name: "Cilacap", province: "Jawa Tengah", zone: "Banyumas Raya" },
  { name: "Banjarnegara", province: "Jawa Tengah", zone: "Banyumas Raya" },
  { name: "Purbalingga", province: "Jawa Tengah", zone: "Banyumas Raya" },
  { name: "Kudus", province: "Jawa Tengah", zone: "Muria" },
  { name: "Jepara", province: "Jawa Tengah", zone: "Muria" },
  { name: "Pati", province: "Jawa Tengah", zone: "Muria" },
  { name: "Rembang", province: "Jawa Tengah", zone: "Muria" },
  { name: "Blora", province: "Jawa Tengah", zone: "Muria" },
  { name: "Grobogan", province: "Jawa Tengah", zone: "Muria" },

  // ===== DI YOGYAKARTA =====
  { name: "Yogyakarta", province: "DI Yogyakarta", zone: "Yogyakarta" },
  { name: "Sleman", province: "DI Yogyakarta", zone: "Yogyakarta" },
  { name: "Bantul", province: "DI Yogyakarta", zone: "Yogyakarta" },
  { name: "Kulon Progo", province: "DI Yogyakarta", zone: "Yogyakarta" },
  { name: "Gunung Kidul", province: "DI Yogyakarta", zone: "Yogyakarta" },

  // ===== JAWA TIMUR =====
  { name: "Surabaya", province: "Jawa Timur", zone: "Gerbangkertosusila" },
  { name: "Sidoarjo", province: "Jawa Timur", zone: "Gerbangkertosusila" },
  { name: "Gresik", province: "Jawa Timur", zone: "Gerbangkertosusila" },
  { name: "Mojokerto", province: "Jawa Timur", zone: "Gerbangkertosusila" },
  { name: "Kabupaten Mojokerto", province: "Jawa Timur", zone: "Gerbangkertosusila" },
  { name: "Pasuruan", province: "Jawa Timur", zone: "Gerbangkertosusila" },
  { name: "Kabupaten Pasuruan", province: "Jawa Timur", zone: "Gerbangkertosusila" },
  { name: "Lamongan", province: "Jawa Timur", zone: "Pantura Jatim" },
  { name: "Tuban", province: "Jawa Timur", zone: "Pantura Jatim" },
  { name: "Bojonegoro", province: "Jawa Timur", zone: "Pantura Jatim" },
  { name: "Malang", province: "Jawa Timur", zone: "Malang Raya" },
  { name: "Kabupaten Malang", province: "Jawa Timur", zone: "Malang Raya" },
  { name: "Batu", province: "Jawa Timur", zone: "Malang Raya" },
  { name: "Kediri", province: "Jawa Timur", zone: "Kediri Raya" },
  { name: "Kabupaten Kediri", province: "Jawa Timur", zone: "Kediri Raya" },
  { name: "Nganjuk", province: "Jawa Timur", zone: "Kediri Raya" },
  { name: "Tulungagung", province: "Jawa Timur", zone: "Kediri Raya" },
  { name: "Trenggalek", province: "Jawa Timur", zone: "Kediri Raya" },
  { name: "Blitar", province: "Jawa Timur", zone: "Kediri Raya" },
  { name: "Kabupaten Blitar", province: "Jawa Timur", zone: "Kediri Raya" },
  { name: "Madiun", province: "Jawa Timur", zone: "Madiun Raya" },
  { name: "Kabupaten Madiun", province: "Jawa Timur", zone: "Madiun Raya" },
  { name: "Magetan", province: "Jawa Timur", zone: "Madiun Raya" },
  { name: "Ponorogo", province: "Jawa Timur", zone: "Madiun Raya" },
  { name: "Pacitan", province: "Jawa Timur", zone: "Madiun Raya" },
  { name: "Ngawi", province: "Jawa Timur", zone: "Madiun Raya" },
  { name: "Jember", province: "Jawa Timur", zone: "Tapal Kuda" },
  { name: "Banyuwangi", province: "Jawa Timur", zone: "Tapal Kuda" },
  { name: "Probolinggo", province: "Jawa Timur", zone: "Tapal Kuda" },
  { name: "Kabupaten Probolinggo", province: "Jawa Timur", zone: "Tapal Kuda" },
  { name: "Lumajang", province: "Jawa Timur", zone: "Tapal Kuda" },
  { name: "Bondowoso", province: "Jawa Timur", zone: "Tapal Kuda" },
  { name: "Situbondo", province: "Jawa Timur", zone: "Tapal Kuda" },
  { name: "Bangkalan", province: "Jawa Timur", zone: "Madura" },
  { name: "Sampang", province: "Jawa Timur", zone: "Madura" },
  { name: "Pamekasan", province: "Jawa Timur", zone: "Madura" },
  { name: "Sumenep", province: "Jawa Timur", zone: "Madura" },

  // ===== BALI =====
  { name: "Denpasar", province: "Bali", zone: "Bali Selatan" },
  { name: "Badung", province: "Bali", zone: "Bali Selatan" },
  { name: "Gianyar", province: "Bali", zone: "Bali Selatan" },
  { name: "Klungkung", province: "Bali", zone: "Bali Selatan" },
  { name: "Bangli", province: "Bali", zone: "Bali Tengah" },
  { name: "Tabanan", province: "Bali", zone: "Bali Tengah" },
  { name: "Jembrana", province: "Bali", zone: "Bali Barat" },
  { name: "Karangasem", province: "Bali", zone: "Bali Timur" },
  { name: "Singaraja", province: "Bali", zone: "Bali Utara" },
  { name: "Buleleng", province: "Bali", zone: "Bali Utara" },

  // ===== ACEH =====
  { name: "Banda Aceh", province: "Aceh", zone: "Aceh Utara" },
  { name: "Sabang", province: "Aceh", zone: "Aceh Utara" },
  { name: "Aceh Besar", province: "Aceh", zone: "Aceh Utara" },
  { name: "Pidie", province: "Aceh", zone: "Aceh Utara" },
  { name: "Pidie Jaya", province: "Aceh", zone: "Aceh Utara" },
  { name: "Bireuen", province: "Aceh", zone: "Aceh Utara" },
  { name: "Lhokseumawe", province: "Aceh", zone: "Aceh Utara" },
  { name: "Aceh Utara", province: "Aceh", zone: "Aceh Utara" },
  { name: "Langsa", province: "Aceh", zone: "Aceh Timur" },
  { name: "Aceh Timur", province: "Aceh", zone: "Aceh Timur" },
  { name: "Aceh Tamiang", province: "Aceh", zone: "Aceh Timur" },
  { name: "Aceh Tengah", province: "Aceh", zone: "Aceh Tengah" },
  { name: "Bener Meriah", province: "Aceh", zone: "Aceh Tengah" },
  { name: "Gayo Lues", province: "Aceh", zone: "Aceh Tengah" },
  { name: "Aceh Tenggara", province: "Aceh", zone: "Aceh Tengah" },
  { name: "Aceh Barat", province: "Aceh", zone: "Aceh Barat" },
  { name: "Aceh Barat Daya", province: "Aceh", zone: "Aceh Barat" },
  { name: "Aceh Selatan", province: "Aceh", zone: "Aceh Barat" },
  { name: "Aceh Singkil", province: "Aceh", zone: "Aceh Barat" },
  { name: "Subulussalam", province: "Aceh", zone: "Aceh Barat" },
  { name: "Nagan Raya", province: "Aceh", zone: "Aceh Barat" },

  // ===== SUMATERA UTARA =====
  { name: "Medan", province: "Sumatera Utara", zone: "Mebidangro" },
  { name: "Binjai", province: "Sumatera Utara", zone: "Mebidangro" },
  { name: "Deli Serdang", province: "Sumatera Utara", zone: "Mebidangro" },
  { name: "Serdang Bedagai", province: "Sumatera Utara", zone: "Mebidangro" },
  { name: "Tebing Tinggi", province: "Sumatera Utara", zone: "Mebidangro" },
  { name: "Pematang Siantar", province: "Sumatera Utara", zone: "Sumut Tengah" },
  { name: "Simalungun", province: "Sumatera Utara", zone: "Sumut Tengah" },
  { name: "Asahan", province: "Sumatera Utara", zone: "Sumut Tengah" },
  { name: "Tanjung Balai", province: "Sumatera Utara", zone: "Sumut Tengah" },
  { name: "Labuhanbatu", province: "Sumatera Utara", zone: "Sumut Tengah" },
  { name: "Karo", province: "Sumatera Utara", zone: "Sumut Tengah" },
  { name: "Dairi", province: "Sumatera Utara", zone: "Sumut Tengah" },
  { name: "Toba", province: "Sumatera Utara", zone: "Sumut Tengah" },
  { name: "Sibolga", province: "Sumatera Utara", zone: "Tapanuli" },
  { name: "Tapanuli Tengah", province: "Sumatera Utara", zone: "Tapanuli" },
  { name: "Tapanuli Selatan", province: "Sumatera Utara", zone: "Tapanuli" },
  { name: "Tapanuli Utara", province: "Sumatera Utara", zone: "Tapanuli" },
  { name: "Padang Sidempuan", province: "Sumatera Utara", zone: "Tapanuli" },
  { name: "Mandailing Natal", province: "Sumatera Utara", zone: "Tapanuli" },
  { name: "Gunungsitoli", province: "Sumatera Utara", zone: "Nias" },
  { name: "Nias", province: "Sumatera Utara", zone: "Nias" },

  // ===== SUMATERA BARAT =====
  { name: "Padang", province: "Sumatera Barat", zone: "Sumbar Tengah" },
  { name: "Padang Pariaman", province: "Sumatera Barat", zone: "Sumbar Tengah" },
  { name: "Pariaman", province: "Sumatera Barat", zone: "Sumbar Tengah" },
  { name: "Bukittinggi", province: "Sumatera Barat", zone: "Sumbar Utara" },
  { name: "Agam", province: "Sumatera Barat", zone: "Sumbar Utara" },
  { name: "Payakumbuh", province: "Sumatera Barat", zone: "Sumbar Utara" },
  { name: "Lima Puluh Kota", province: "Sumatera Barat", zone: "Sumbar Utara" },
  { name: "Padang Panjang", province: "Sumatera Barat", zone: "Sumbar Utara" },
  { name: "Tanah Datar", province: "Sumatera Barat", zone: "Sumbar Utara" },
  { name: "Solok", province: "Sumatera Barat", zone: "Sumbar Selatan" },
  { name: "Solok Selatan", province: "Sumatera Barat", zone: "Sumbar Selatan" },
  { name: "Sawahlunto", province: "Sumatera Barat", zone: "Sumbar Selatan" },
  { name: "Sijunjung", province: "Sumatera Barat", zone: "Sumbar Selatan" },
  { name: "Dharmasraya", province: "Sumatera Barat", zone: "Sumbar Selatan" },
  { name: "Pesisir Selatan", province: "Sumatera Barat", zone: "Sumbar Pesisir" },
  { name: "Pasaman", province: "Sumatera Barat", zone: "Sumbar Pesisir" },
  { name: "Pasaman Barat", province: "Sumatera Barat", zone: "Sumbar Pesisir" },
  { name: "Mentawai", province: "Sumatera Barat", zone: "Sumbar Pesisir" },

  // ===== RIAU =====
  { name: "Pekanbaru", province: "Riau", zone: "Riau Pesisir" },
  { name: "Dumai", province: "Riau", zone: "Riau Pesisir" },
  { name: "Bengkalis", province: "Riau", zone: "Riau Pesisir" },
  { name: "Siak", province: "Riau", zone: "Riau Pesisir" },
  { name: "Kepulauan Meranti", province: "Riau", zone: "Riau Pesisir" },
  { name: "Rokan Hilir", province: "Riau", zone: "Riau Pesisir" },
  { name: "Pelalawan", province: "Riau", zone: "Riau Pesisir" },
  { name: "Kampar", province: "Riau", zone: "Riau Tengah" },
  { name: "Rokan Hulu", province: "Riau", zone: "Riau Tengah" },
  { name: "Kuantan Singingi", province: "Riau", zone: "Riau Tengah" },
  { name: "Indragiri Hulu", province: "Riau", zone: "Riau Tengah" },
  { name: "Indragiri Hilir", province: "Riau", zone: "Riau Tengah" },

  // ===== KEPULAUAN RIAU =====
  { name: "Batam", province: "Kepulauan Riau", zone: "Kepri" },
  { name: "Tanjung Pinang", province: "Kepulauan Riau", zone: "Kepri" },
  { name: "Bintan", province: "Kepulauan Riau", zone: "Kepri" },
  { name: "Karimun", province: "Kepulauan Riau", zone: "Kepri" },
  { name: "Lingga", province: "Kepulauan Riau", zone: "Kepri" },
  { name: "Natuna", province: "Kepulauan Riau", zone: "Kepri" },
  { name: "Kepulauan Anambas", province: "Kepulauan Riau", zone: "Kepri" },

  // ===== JAMBI =====
  { name: "Jambi", province: "Jambi", zone: "Jambi Timur" },
  { name: "Muaro Jambi", province: "Jambi", zone: "Jambi Timur" },
  { name: "Batanghari", province: "Jambi", zone: "Jambi Timur" },
  { name: "Tanjung Jabung Barat", province: "Jambi", zone: "Jambi Timur" },
  { name: "Tanjung Jabung Timur", province: "Jambi", zone: "Jambi Timur" },
  { name: "Sungai Penuh", province: "Jambi", zone: "Jambi Barat" },
  { name: "Kerinci", province: "Jambi", zone: "Jambi Barat" },
  { name: "Merangin", province: "Jambi", zone: "Jambi Barat" },
  { name: "Sarolangun", province: "Jambi", zone: "Jambi Barat" },
  { name: "Bungo", province: "Jambi", zone: "Jambi Barat" },
  { name: "Tebo", province: "Jambi", zone: "Jambi Barat" },

  // ===== BENGKULU =====
  { name: "Bengkulu", province: "Bengkulu", zone: "Bengkulu" },
  { name: "Bengkulu Utara", province: "Bengkulu", zone: "Bengkulu" },
  { name: "Bengkulu Selatan", province: "Bengkulu", zone: "Bengkulu" },
  { name: "Bengkulu Tengah", province: "Bengkulu", zone: "Bengkulu" },
  { name: "Lebong", province: "Bengkulu", zone: "Bengkulu" },
  { name: "Rejang Lebong", province: "Bengkulu", zone: "Bengkulu" },
  { name: "Kepahiang", province: "Bengkulu", zone: "Bengkulu" },
  { name: "Mukomuko", province: "Bengkulu", zone: "Bengkulu" },
  { name: "Kaur", province: "Bengkulu", zone: "Bengkulu" },
  { name: "Seluma", province: "Bengkulu", zone: "Bengkulu" },

  // ===== SUMATERA SELATAN =====
  { name: "Palembang", province: "Sumatera Selatan", zone: "Sumsel Timur" },
  { name: "Banyuasin", province: "Sumatera Selatan", zone: "Sumsel Timur" },
  { name: "Ogan Komering Ulu", province: "Sumatera Selatan", zone: "Sumsel Timur" },
  { name: "Ogan Komering Ilir", province: "Sumatera Selatan", zone: "Sumsel Timur" },
  { name: "Ogan Ilir", province: "Sumatera Selatan", zone: "Sumsel Timur" },
  { name: "Musi Banyuasin", province: "Sumatera Selatan", zone: "Sumsel Tengah" },
  { name: "Musi Rawas", province: "Sumatera Selatan", zone: "Sumsel Tengah" },
  { name: "Lubuklinggau", province: "Sumatera Selatan", zone: "Sumsel Barat" },
  { name: "Empat Lawang", province: "Sumatera Selatan", zone: "Sumsel Barat" },
  { name: "Pagar Alam", province: "Sumatera Selatan", zone: "Sumsel Barat" },
  { name: "Lahat", province: "Sumatera Selatan", zone: "Sumsel Barat" },
  { name: "Prabumulih", province: "Sumatera Selatan", zone: "Sumsel Barat" },

  // ===== BANGKA BELITUNG =====
  { name: "Pangkalpinang", province: "Bangka Belitung", zone: "Bangka" },
  { name: "Bangka", province: "Bangka Belitung", zone: "Bangka" },
  { name: "Bangka Tengah", province: "Bangka Belitung", zone: "Bangka" },
  { name: "Bangka Barat", province: "Bangka Belitung", zone: "Bangka" },
  { name: "Bangka Selatan", province: "Bangka Belitung", zone: "Bangka" },
  { name: "Belitung", province: "Bangka Belitung", zone: "Belitung" },
  { name: "Belitung Timur", province: "Bangka Belitung", zone: "Belitung" },

  // ===== LAMPUNG =====
  { name: "Bandar Lampung", province: "Lampung", zone: "Lampung Selatan" },
  { name: "Lampung Selatan", province: "Lampung", zone: "Lampung Selatan" },
  { name: "Pesawaran", province: "Lampung", zone: "Lampung Selatan" },
  { name: "Pringsewu", province: "Lampung", zone: "Lampung Selatan" },
  { name: "Tanggamus", province: "Lampung", zone: "Lampung Selatan" },
  { name: "Metro", province: "Lampung", zone: "Lampung Tengah" },
  { name: "Lampung Tengah", province: "Lampung", zone: "Lampung Tengah" },
  { name: "Lampung Timur", province: "Lampung", zone: "Lampung Tengah" },
  { name: "Lampung Utara", province: "Lampung", zone: "Lampung Utara" },
  { name: "Lampung Barat", province: "Lampung", zone: "Lampung Utara" },
  { name: "Way Kanan", province: "Lampung", zone: "Lampung Utara" },
  { name: "Tulang Bawang", province: "Lampung", zone: "Lampung Utara" },
  { name: "Mesuji", province: "Lampung", zone: "Lampung Utara" },
  { name: "Pesisir Barat", province: "Lampung", zone: "Lampung Utara" },

  // ===== KALIMANTAN BARAT =====
  { name: "Pontianak", province: "Kalimantan Barat", zone: "Kalbar Pesisir" },
  { name: "Kabupaten Pontianak", province: "Kalimantan Barat", zone: "Kalbar Pesisir" },
  { name: "Mempawah", province: "Kalimantan Barat", zone: "Kalbar Pesisir" },
  { name: "Singkawang", province: "Kalimantan Barat", zone: "Kalbar Pesisir" },
  { name: "Sambas", province: "Kalimantan Barat", zone: "Kalbar Pesisir" },
  { name: "Bengkayang", province: "Kalimantan Barat", zone: "Kalbar Pesisir" },
  { name: "Landak", province: "Kalimantan Barat", zone: "Kalbar Pesisir" },
  { name: "Kubu Raya", province: "Kalimantan Barat", zone: "Kalbar Pesisir" },
  { name: "Sintang", province: "Kalimantan Barat", zone: "Kalbar Pedalaman" },
  { name: "Sanggau", province: "Kalimantan Barat", zone: "Kalbar Pedalaman" },
  { name: "Sekadau", province: "Kalimantan Barat", zone: "Kalbar Pedalaman" },
  { name: "Melawi", province: "Kalimantan Barat", zone: "Kalbar Pedalaman" },
  { name: "Kapuas Hulu", province: "Kalimantan Barat", zone: "Kalbar Pedalaman" },
  { name: "Ketapang", province: "Kalimantan Barat", zone: "Kalbar Selatan" },
  { name: "Kayong Utara", province: "Kalimantan Barat", zone: "Kalbar Selatan" },

  // ===== KALIMANTAN TENGAH =====
  { name: "Palangka Raya", province: "Kalimantan Tengah", zone: "Kalteng" },
  { name: "Kotawaringin Timur", province: "Kalimantan Tengah", zone: "Kalteng" },
  { name: "Kotawaringin Barat", province: "Kalimantan Tengah", zone: "Kalteng" },
  { name: "Kapuas", province: "Kalimantan Tengah", zone: "Kalteng" },
  { name: "Pulang Pisau", province: "Kalimantan Tengah", zone: "Kalteng" },
  { name: "Katingan", province: "Kalimantan Tengah", zone: "Kalteng" },
  { name: "Gunung Mas", province: "Kalimantan Tengah", zone: "Kalteng" },
  { name: "Barito Selatan", province: "Kalimantan Tengah", zone: "Kalteng" },
  { name: "Barito Timur", province: "Kalimantan Tengah", zone: "Kalteng" },
  { name: "Barito Utara", province: "Kalimantan Tengah", zone: "Kalteng" },
  { name: "Murung Raya", province: "Kalimantan Tengah", zone: "Kalteng" },
  { name: "Lamandau", province: "Kalimantan Tengah", zone: "Kalteng" },
  { name: "Sukamara", province: "Kalimantan Tengah", zone: "Kalteng" },
  { name: "Seruyan", province: "Kalimantan Tengah", zone: "Kalteng" },

  // ===== KALIMANTAN SELATAN =====
  { name: "Banjarmasin", province: "Kalimantan Selatan", zone: "Banjar Raya" },
  { name: "Banjarbaru", province: "Kalimantan Selatan", zone: "Banjar Raya" },
  { name: "Banjar", province: "Kalimantan Selatan", zone: "Banjar Raya" },
  { name: "Barito Kuala", province: "Kalimantan Selatan", zone: "Banjar Raya" },
  { name: "Tapin", province: "Kalimantan Selatan", zone: "Kalsel" },
  { name: "Hulu Sungai Selatan", province: "Kalimantan Selatan", zone: "Kalsel" },
  { name: "Hulu Sungai Tengah", province: "Kalimantan Selatan", zone: "Kalsel" },
  { name: "Hulu Sungai Utara", province: "Kalimantan Selatan", zone: "Kalsel" },
  { name: "Balangan", province: "Kalimantan Selatan", zone: "Kalsel" },
  { name: "Tabalong", province: "Kalimantan Selatan", zone: "Kalsel" },
  { name: "Tanah Laut", province: "Kalimantan Selatan", zone: "Kalsel" },
  { name: "Tanah Bumbu", province: "Kalimantan Selatan", zone: "Kalsel" },
  { name: "Kotabaru", province: "Kalimantan Selatan", zone: "Kalsel" },

  // ===== KALIMANTAN TIMUR =====
  { name: "Samarinda", province: "Kalimantan Timur", zone: "Kaltim Tengah" },
  { name: "Balikpapan", province: "Kalimantan Timur", zone: "Kaltim Selatan" },
  { name: "Bontang", province: "Kalimantan Timur", zone: "Kaltim Tengah" },
  { name: "Kutai Kartanegara", province: "Kalimantan Timur", zone: "Kaltim Tengah" },
  { name: "Kutai Barat", province: "Kalimantan Timur", zone: "Kaltim Tengah" },
  { name: "Kutai Timur", province: "Kalimantan Timur", zone: "Kaltim Tengah" },
  { name: "Berau", province: "Kalimantan Timur", zone: "Kaltim Utara" },
  { name: "Paser", province: "Kalimantan Timur", zone: "Kaltim Selatan" },
  { name: "Penajam Paser Utara", province: "Kalimantan Timur", zone: "Kaltim Selatan" },
  { name: "Mahakam Ulu", province: "Kalimantan Timur", zone: "Kaltim Tengah" },

  // ===== KALIMANTAN UTARA =====
  { name: "Tarakan", province: "Kalimantan Utara", zone: "Kaltara" },
  { name: "Bulungan", province: "Kalimantan Utara", zone: "Kaltara" },
  { name: "Malinau", province: "Kalimantan Utara", zone: "Kaltara" },
  { name: "Nunukan", province: "Kalimantan Utara", zone: "Kaltara" },
  { name: "Tana Tidung", province: "Kalimantan Utara", zone: "Kaltara" },

  // ===== SULAWESI UTARA =====
  { name: "Manado", province: "Sulawesi Utara", zone: "Sulut Daratan" },
  { name: "Bitung", province: "Sulawesi Utara", zone: "Sulut Daratan" },
  { name: "Tomohon", province: "Sulawesi Utara", zone: "Sulut Daratan" },
  { name: "Minahasa", province: "Sulawesi Utara", zone: "Sulut Daratan" },
  { name: "Minahasa Utara", province: "Sulawesi Utara", zone: "Sulut Daratan" },
  { name: "Minahasa Selatan", province: "Sulawesi Utara", zone: "Sulut Daratan" },
  { name: "Minahasa Tenggara", province: "Sulawesi Utara", zone: "Sulut Daratan" },
  { name: "Kotamobagu", province: "Sulawesi Utara", zone: "Bolaang Mongondow" },
  { name: "Bolaang Mongondow", province: "Sulawesi Utara", zone: "Bolaang Mongondow" },
  { name: "Bolaang Mongondow Utara", province: "Sulawesi Utara", zone: "Bolaang Mongondow" },
  { name: "Sangihe", province: "Sulawesi Utara", zone: "Sulut Kepulauan" },
  { name: "Talaud", province: "Sulawesi Utara", zone: "Sulut Kepulauan" },
  { name: "Sitaro", province: "Sulawesi Utara", zone: "Sulut Kepulauan" },

  // ===== GORONTALO =====
  { name: "Gorontalo", province: "Gorontalo", zone: "Gorontalo" },
  { name: "Kabupaten Gorontalo", province: "Gorontalo", zone: "Gorontalo" },
  { name: "Gorontalo Utara", province: "Gorontalo", zone: "Gorontalo" },
  { name: "Boalemo", province: "Gorontalo", zone: "Gorontalo" },
  { name: "Bone Bolango", province: "Gorontalo", zone: "Gorontalo" },
  { name: "Pohuwato", province: "Gorontalo", zone: "Gorontalo" },

  // ===== SULAWESI TENGAH =====
  { name: "Palu", province: "Sulawesi Tengah", zone: "Sulteng Barat" },
  { name: "Donggala", province: "Sulawesi Tengah", zone: "Sulteng Barat" },
  { name: "Sigi", province: "Sulawesi Tengah", zone: "Sulteng Barat" },
  { name: "Parigi Moutong", province: "Sulawesi Tengah", zone: "Sulteng Barat" },
  { name: "Toli-Toli", province: "Sulawesi Tengah", zone: "Sulteng Barat" },
  { name: "Buol", province: "Sulawesi Tengah", zone: "Sulteng Barat" },
  { name: "Poso", province: "Sulawesi Tengah", zone: "Sulteng Tengah" },
  { name: "Morowali", province: "Sulawesi Tengah", zone: "Sulteng Timur" },
  { name: "Morowali Utara", province: "Sulawesi Tengah", zone: "Sulteng Timur" },
  { name: "Banggai", province: "Sulawesi Tengah", zone: "Sulteng Timur" },
  { name: "Banggai Kepulauan", province: "Sulawesi Tengah", zone: "Sulteng Timur" },
  { name: "Banggai Laut", province: "Sulawesi Tengah", zone: "Sulteng Timur" },
  { name: "Tojo Una-Una", province: "Sulawesi Tengah", zone: "Sulteng Timur" },

  // ===== SULAWESI BARAT =====
  { name: "Mamuju", province: "Sulawesi Barat", zone: "Sulbar" },
  { name: "Mamuju Tengah", province: "Sulawesi Barat", zone: "Sulbar" },
  { name: "Mamuju Utara", province: "Sulawesi Barat", zone: "Sulbar" },
  { name: "Mamasa", province: "Sulawesi Barat", zone: "Sulbar" },
  { name: "Majene", province: "Sulawesi Barat", zone: "Sulbar" },
  { name: "Polewali Mandar", province: "Sulawesi Barat", zone: "Sulbar" },
  { name: "Pasangkayu", province: "Sulawesi Barat", zone: "Sulbar" },

  // ===== SULAWESI SELATAN =====
  { name: "Makassar", province: "Sulawesi Selatan", zone: "Mamminasata" },
  { name: "Gowa", province: "Sulawesi Selatan", zone: "Mamminasata" },
  { name: "Maros", province: "Sulawesi Selatan", zone: "Mamminasata" },
  { name: "Takalar", province: "Sulawesi Selatan", zone: "Mamminasata" },
  { name: "Parepare", province: "Sulawesi Selatan", zone: "Sulsel Barat" },
  { name: "Pinrang", province: "Sulawesi Selatan", zone: "Sulsel Barat" },
  { name: "Sidrap", province: "Sulawesi Selatan", zone: "Sulsel Barat" },
  { name: "Barru", province: "Sulawesi Selatan", zone: "Sulsel Barat" },
  { name: "Pangkep", province: "Sulawesi Selatan", zone: "Sulsel Barat" },
  { name: "Palopo", province: "Sulawesi Selatan", zone: "Sulsel Utara" },
  { name: "Luwu", province: "Sulawesi Selatan", zone: "Sulsel Utara" },
  { name: "Luwu Timur", province: "Sulawesi Selatan", zone: "Sulsel Utara" },
  { name: "Luwu Utara", province: "Sulawesi Selatan", zone: "Sulsel Utara" },
  { name: "Tana Toraja", province: "Sulawesi Selatan", zone: "Sulsel Utara" },
  { name: "Toraja Utara", province: "Sulawesi Selatan", zone: "Sulsel Utara" },
  { name: "Enrekang", province: "Sulawesi Selatan", zone: "Sulsel Utara" },
  { name: "Bone", province: "Sulawesi Selatan", zone: "Sulsel Timur" },
  { name: "Wajo", province: "Sulawesi Selatan", zone: "Sulsel Timur" },
  { name: "Soppeng", province: "Sulawesi Selatan", zone: "Sulsel Timur" },
  { name: "Sinjai", province: "Sulawesi Selatan", zone: "Sulsel Timur" },
  { name: "Bulukumba", province: "Sulawesi Selatan", zone: "Sulsel Selatan" },
  { name: "Bantaeng", province: "Sulawesi Selatan", zone: "Sulsel Selatan" },
  { name: "Jeneponto", province: "Sulawesi Selatan", zone: "Sulsel Selatan" },
  { name: "Selayar", province: "Sulawesi Selatan", zone: "Sulsel Selatan" },

  // ===== SULAWESI TENGGARA =====
  { name: "Kendari", province: "Sulawesi Tenggara", zone: "Sultra Daratan" },
  { name: "Konawe", province: "Sulawesi Tenggara", zone: "Sultra Daratan" },
  { name: "Konawe Selatan", province: "Sulawesi Tenggara", zone: "Sultra Daratan" },
  { name: "Konawe Utara", province: "Sulawesi Tenggara", zone: "Sultra Daratan" },
  { name: "Konawe Kepulauan", province: "Sulawesi Tenggara", zone: "Sultra Kepulauan" },
  { name: "Kolaka", province: "Sulawesi Tenggara", zone: "Sultra Daratan" },
  { name: "Kolaka Utara", province: "Sulawesi Tenggara", zone: "Sultra Daratan" },
  { name: "Kolaka Timur", province: "Sulawesi Tenggara", zone: "Sultra Daratan" },
  { name: "Bombana", province: "Sulawesi Tenggara", zone: "Sultra Daratan" },
  { name: "Bau-Bau", province: "Sulawesi Tenggara", zone: "Sultra Kepulauan" },
  { name: "Buton", province: "Sulawesi Tenggara", zone: "Sultra Kepulauan" },
  { name: "Buton Utara", province: "Sulawesi Tenggara", zone: "Sultra Kepulauan" },
  { name: "Buton Selatan", province: "Sulawesi Tenggara", zone: "Sultra Kepulauan" },
  { name: "Buton Tengah", province: "Sulawesi Tenggara", zone: "Sultra Kepulauan" },
  { name: "Muna", province: "Sulawesi Tenggara", zone: "Sultra Kepulauan" },
  { name: "Muna Barat", province: "Sulawesi Tenggara", zone: "Sultra Kepulauan" },
  { name: "Wakatobi", province: "Sulawesi Tenggara", zone: "Sultra Kepulauan" },

  // ===== NUSA TENGGARA BARAT =====
  { name: "Mataram", province: "Nusa Tenggara Barat", zone: "Lombok" },
  { name: "Lombok Barat", province: "Nusa Tenggara Barat", zone: "Lombok" },
  { name: "Lombok Tengah", province: "Nusa Tenggara Barat", zone: "Lombok" },
  { name: "Lombok Timur", province: "Nusa Tenggara Barat", zone: "Lombok" },
  { name: "Lombok Utara", province: "Nusa Tenggara Barat", zone: "Lombok" },
  { name: "Bima", province: "Nusa Tenggara Barat", zone: "Sumbawa" },
  { name: "Kabupaten Bima", province: "Nusa Tenggara Barat", zone: "Sumbawa" },
  { name: "Dompu", province: "Nusa Tenggara Barat", zone: "Sumbawa" },
  { name: "Sumbawa", province: "Nusa Tenggara Barat", zone: "Sumbawa" },
  { name: "Sumbawa Barat", province: "Nusa Tenggara Barat", zone: "Sumbawa" },

  // ===== NUSA TENGGARA TIMUR =====
  { name: "Kupang", province: "Nusa Tenggara Timur", zone: "Timor Barat" },
  { name: "Kabupaten Kupang", province: "Nusa Tenggara Timur", zone: "Timor Barat" },
  { name: "Timor Tengah Selatan", province: "Nusa Tenggara Timur", zone: "Timor Barat" },
  { name: "Timor Tengah Utara", province: "Nusa Tenggara Timur", zone: "Timor Barat" },
  { name: "Belu", province: "Nusa Tenggara Timur", zone: "Timor Barat" },
  { name: "Malaka", province: "Nusa Tenggara Timur", zone: "Timor Barat" },
  { name: "Rote Ndao", province: "Nusa Tenggara Timur", zone: "Timor Barat" },
  { name: "Sabu Raijua", province: "Nusa Tenggara Timur", zone: "Timor Barat" },
  { name: "Sumba Barat", province: "Nusa Tenggara Timur", zone: "Sumba" },
  { name: "Sumba Tengah", province: "Nusa Tenggara Timur", zone: "Sumba" },
  { name: "Sumba Timur", province: "Nusa Tenggara Timur", zone: "Sumba" },
  { name: "Sumba Barat Daya", province: "Nusa Tenggara Timur", zone: "Sumba" },
  { name: "Maumere", province: "Nusa Tenggara Timur", zone: "Flores" },
  { name: "Sikka", province: "Nusa Tenggara Timur", zone: "Flores" },
  { name: "Ende", province: "Nusa Tenggara Timur", zone: "Flores" },
  { name: "Ngada", province: "Nusa Tenggara Timur", zone: "Flores" },
  { name: "Nagekeo", province: "Nusa Tenggara Timur", zone: "Flores" },
  { name: "Manggarai", province: "Nusa Tenggara Timur", zone: "Flores" },
  { name: "Manggarai Barat", province: "Nusa Tenggara Timur", zone: "Flores" },
  { name: "Manggarai Timur", province: "Nusa Tenggara Timur", zone: "Flores" },
  { name: "Labuan Bajo", province: "Nusa Tenggara Timur", zone: "Flores" },
  { name: "Lembata", province: "Nusa Tenggara Timur", zone: "Solor-Alor" },
  { name: "Flores Timur", province: "Nusa Tenggara Timur", zone: "Solor-Alor" },
  { name: "Alor", province: "Nusa Tenggara Timur", zone: "Solor-Alor" },

  // ===== MALUKU =====
  { name: "Ambon", province: "Maluku", zone: "Maluku Tengah" },
  { name: "Maluku Tengah", province: "Maluku", zone: "Maluku Tengah" },
  { name: "Seram Bagian Barat", province: "Maluku", zone: "Maluku Tengah" },
  { name: "Seram Bagian Timur", province: "Maluku", zone: "Maluku Tengah" },
  { name: "Buru", province: "Maluku", zone: "Maluku Tengah" },
  { name: "Buru Selatan", province: "Maluku", zone: "Maluku Tengah" },
  { name: "Tual", province: "Maluku", zone: "Maluku Tenggara" },
  { name: "Maluku Tenggara", province: "Maluku", zone: "Maluku Tenggara" },
  { name: "Kepulauan Aru", province: "Maluku", zone: "Maluku Tenggara" },
  { name: "Maluku Barat Daya", province: "Maluku", zone: "Maluku Tenggara" },
  { name: "Kepulauan Tanimbar", province: "Maluku", zone: "Maluku Tenggara" },

  // ===== MALUKU UTARA =====
  { name: "Ternate", province: "Maluku Utara", zone: "Halmahera" },
  { name: "Tidore Kepulauan", province: "Maluku Utara", zone: "Halmahera" },
  { name: "Halmahera Barat", province: "Maluku Utara", zone: "Halmahera" },
  { name: "Halmahera Tengah", province: "Maluku Utara", zone: "Halmahera" },
  { name: "Halmahera Utara", province: "Maluku Utara", zone: "Halmahera" },
  { name: "Halmahera Selatan", province: "Maluku Utara", zone: "Halmahera" },
  { name: "Halmahera Timur", province: "Maluku Utara", zone: "Halmahera" },
  { name: "Kepulauan Sula", province: "Maluku Utara", zone: "Malut" },
  { name: "Pulau Morotai", province: "Maluku Utara", zone: "Malut" },
  { name: "Pulau Taliabu", province: "Maluku Utara", zone: "Malut" },

  // ===== PAPUA =====
  { name: "Jayapura", province: "Papua", zone: "Papua Utara" },
  { name: "Kabupaten Jayapura", province: "Papua", zone: "Papua Utara" },
  { name: "Keerom", province: "Papua", zone: "Papua Utara" },
  { name: "Sarmi", province: "Papua", zone: "Papua Utara" },
  { name: "Mamberamo Raya", province: "Papua", zone: "Papua Utara" },
  { name: "Biak Numfor", province: "Papua", zone: "Papua Utara" },
  { name: "Supiori", province: "Papua", zone: "Papua Utara" },
  { name: "Waropen", province: "Papua", zone: "Papua Utara" },
  { name: "Kepulauan Yapen", province: "Papua", zone: "Papua Utara" },

  // ===== PAPUA BARAT =====
  { name: "Manokwari", province: "Papua Barat", zone: "Papua Barat" },
  { name: "Manokwari Selatan", province: "Papua Barat", zone: "Papua Barat" },
  { name: "Pegunungan Arfak", province: "Papua Barat", zone: "Papua Barat" },
  { name: "Bintuni", province: "Papua Barat", zone: "Papua Barat" },
  { name: "Wondama", province: "Papua Barat", zone: "Papua Barat" },
  { name: "Kaimana", province: "Papua Barat", zone: "Papua Barat" },
  { name: "Fakfak", province: "Papua Barat", zone: "Papua Barat" },

  // ===== PAPUA BARAT DAYA =====
  { name: "Sorong", province: "Papua Barat Daya", zone: "Papua Barat Daya" },
  { name: "Kabupaten Sorong", province: "Papua Barat Daya", zone: "Papua Barat Daya" },
  { name: "Sorong Selatan", province: "Papua Barat Daya", zone: "Papua Barat Daya" },
  { name: "Tambrauw", province: "Papua Barat Daya", zone: "Papua Barat Daya" },
  { name: "Maybrat", province: "Papua Barat Daya", zone: "Papua Barat Daya" },
  { name: "Raja Ampat", province: "Papua Barat Daya", zone: "Papua Barat Daya" },

  // ===== PAPUA TENGAH =====
  { name: "Nabire", province: "Papua Tengah", zone: "Papua Tengah" },
  { name: "Mimika", province: "Papua Tengah", zone: "Papua Tengah" },
  { name: "Timika", province: "Papua Tengah", zone: "Papua Tengah" },
  { name: "Paniai", province: "Papua Tengah", zone: "Papua Tengah" },
  { name: "Dogiyai", province: "Papua Tengah", zone: "Papua Tengah" },
  { name: "Deiyai", province: "Papua Tengah", zone: "Papua Tengah" },
  { name: "Intan Jaya", province: "Papua Tengah", zone: "Papua Tengah" },
  { name: "Puncak", province: "Papua Tengah", zone: "Papua Tengah" },
  { name: "Puncak Jaya", province: "Papua Tengah", zone: "Papua Tengah" },

  // ===== PAPUA PEGUNUNGAN =====
  { name: "Wamena", province: "Papua Pegunungan", zone: "Papua Pegunungan" },
  { name: "Jayawijaya", province: "Papua Pegunungan", zone: "Papua Pegunungan" },
  { name: "Lanny Jaya", province: "Papua Pegunungan", zone: "Papua Pegunungan" },
  { name: "Nduga", province: "Papua Pegunungan", zone: "Papua Pegunungan" },
  { name: "Tolikara", province: "Papua Pegunungan", zone: "Papua Pegunungan" },
  { name: "Yahukimo", province: "Papua Pegunungan", zone: "Papua Pegunungan" },
  { name: "Yalimo", province: "Papua Pegunungan", zone: "Papua Pegunungan" },
  { name: "Mamberamo Tengah", province: "Papua Pegunungan", zone: "Papua Pegunungan" },
  { name: "Pegunungan Bintang", province: "Papua Pegunungan", zone: "Papua Pegunungan" },

  // ===== PAPUA SELATAN =====
  { name: "Merauke", province: "Papua Selatan", zone: "Papua Selatan" },
  { name: "Boven Digoel", province: "Papua Selatan", zone: "Papua Selatan" },
  { name: "Mappi", province: "Papua Selatan", zone: "Papua Selatan" },
  { name: "Asmat", province: "Papua Selatan", zone: "Papua Selatan" },
];

export function citiesByProvince(province: string): City[] {
  return CITIES.filter((c) => c.province === province).sort((a, b) => a.name.localeCompare(b.name));
}

export function cityInfo(name: string): City | undefined {
  return CITIES.find((c) => c.name === name);
}

/**
 * Fuzzy filter untuk Combobox typeable search.
 * Match case-insensitive, ignore spasi ekstra, match substring di mana saja.
 * Sort: match di awal nama > match di tengah.
 */
export function searchCities(query: string, province?: string): City[] {
  const q = query.trim().toLowerCase();
  if (!q) return province ? citiesByProvince(province) : CITIES.slice(0, 50);

  const pool = province ? citiesByProvince(province) : CITIES;
  const matches: { city: City; score: number }[] = [];

  for (const city of pool) {
    const name = city.name.toLowerCase();
    if (name === q) matches.push({ city, score: 0 });           // exact
    else if (name.startsWith(q)) matches.push({ city, score: 1 }); // starts with
    else if (name.includes(q)) matches.push({ city, score: 2 });   // contains
    else if (q.length >= 3 && fuzzyMatch(name, q)) matches.push({ city, score: 3 });
  }

  return matches.sort((a, b) => a.score - b.score || a.city.name.localeCompare(b.city.name))
    .slice(0, 100)
    .map((m) => m.city);
}

export function searchProvinces(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...PROVINCES];
  return PROVINCES.filter((p) => {
    const name = p.toLowerCase();
    return name.startsWith(q) || name.includes(q) || (q.length >= 3 && fuzzyMatch(name, q));
  });
}

/** Simple fuzzy: semua karakter query muncul berurutan di name. "jkt" matches "jakarta" */
function fuzzyMatch(name: string, query: string): boolean {
  let i = 0;
  for (const ch of name) {
    if (ch === query[i]) i++;
    if (i === query.length) return true;
  }
  return false;
}
