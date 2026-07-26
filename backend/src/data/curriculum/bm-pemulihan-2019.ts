export interface CurriculumSeedYear {
  yearLevel: number;
  name: string;
  sequence: number;
}

export interface CurriculumSeedStructure {
  code: string;
  name: string;
  sequence: number;
}

export interface CurriculumSeedSkill {
  code: string;
  sequence: number;
  name: string;
  languageStructureCode: string;
  isPreparatory: boolean;
}

export interface BmPemulihanSeedData {
  version: {
    code: string;
    name: string;
    sourceYear: number;
  };
  subject: {
    code: string;
    name: string;
  };
  programme: {
    code: string;
    name: string;
  };
  years: readonly CurriculumSeedYear[];
  languageStructures: readonly CurriculumSeedStructure[];
  remedialSkills: readonly CurriculumSeedSkill[];
}

export const bmPemulihan2019SeedData: BmPemulihanSeedData = {
  version: {
    code: "BM-PEMULIHAN-2019",
    name: "Buku Panduan Bahasa Melayu Pemulihan Khas 2019",
    sourceYear: 2019,
  },
  subject: {
    code: "BM",
    name: "Bahasa Melayu",
  },
  programme: {
    code: "BM-PEMULIHAN",
    name: "Program Pemulihan Khas Bahasa Melayu",
  },
  years: [
    { yearLevel: 1, name: "Tahun 1", sequence: 1 },
    { yearLevel: 2, name: "Tahun 2", sequence: 2 },
    { yearLevel: 3, name: "Tahun 3", sequence: 3 },
  ],
  languageStructures: [
    { code: "PRA", name: "Prabacaan dan Pratulisan", sequence: 1 },
    { code: "ABJAD", name: "Abjad", sequence: 2 },
    { code: "SUKU_KATA", name: "Suku Kata", sequence: 3 },
    { code: "PERKATAAN", name: "Perkataan", sequence: 4 },
    { code: "AYAT", name: "Ayat", sequence: 5 },
  ],
  remedialSkills: [
    { code: "KP-PRA", sequence: 0, name: "Prabacaan dan Pratulisan", languageStructureCode: "PRA", isPreparatory: true },
    { code: "KP01", sequence: 1, name: "Huruf-huruf vokal", languageStructureCode: "ABJAD", isPreparatory: false },
    { code: "KP02", sequence: 2, name: "Huruf-huruf kecil", languageStructureCode: "ABJAD", isPreparatory: false },
    { code: "KP03", sequence: 3, name: "Huruf-huruf besar", languageStructureCode: "ABJAD", isPreparatory: false },
    { code: "KP04", sequence: 4, name: "Suku kata KV", languageStructureCode: "SUKU_KATA", isPreparatory: false },
    { code: "KP05", sequence: 5, name: "Perkataan KV + KV", languageStructureCode: "PERKATAAN", isPreparatory: false },
    { code: "KP06", sequence: 6, name: "Perkataan V + KV", languageStructureCode: "PERKATAAN", isPreparatory: false },
    { code: "KP07", sequence: 7, name: "Perkataan KV + KV + KV", languageStructureCode: "PERKATAAN", isPreparatory: false },
    { code: "KP08", sequence: 8, name: "Perkataan KVK", languageStructureCode: "PERKATAAN", isPreparatory: false },
    { code: "KP09", sequence: 9, name: "Suku kata KVK", languageStructureCode: "SUKU_KATA", isPreparatory: false },
    { code: "KP10", sequence: 10, name: "Perkataan V + KVK", languageStructureCode: "PERKATAAN", isPreparatory: false },
    { code: "KP11", sequence: 11, name: "Perkataan KV + KVK", languageStructureCode: "PERKATAAN", isPreparatory: false },
    { code: "KP12", sequence: 12, name: "Perkataan KVK + KV", languageStructureCode: "PERKATAAN", isPreparatory: false },
    { code: "KP13", sequence: 13, name: "Perkataan KVK + KVK", languageStructureCode: "PERKATAAN", isPreparatory: false },
    { code: "KP14", sequence: 14, name: "Perkataan KV + KV + KVK", languageStructureCode: "PERKATAAN", isPreparatory: false },
    { code: "KP15", sequence: 15, name: "Perkataan KVK + KV + KVK", languageStructureCode: "PERKATAAN", isPreparatory: false },
    { code: "KP16", sequence: 16, name: "Perkataan KVKK", languageStructureCode: "PERKATAAN", isPreparatory: false },
    { code: "KP17", sequence: 17, name: "Suku kata KVKK", languageStructureCode: "SUKU_KATA", isPreparatory: false },
    { code: "KP18", sequence: 18, name: "Perkataan KV + KVKK", languageStructureCode: "PERKATAAN", isPreparatory: false },
    { code: "KP19", sequence: 19, name: "Perkataan V + KVKK", languageStructureCode: "PERKATAAN", isPreparatory: false },
    { code: "KP20", sequence: 20, name: "Perkataan KVK + KVKK", languageStructureCode: "PERKATAAN", isPreparatory: false },
    { code: "KP21", sequence: 21, name: "Perkataan KVKK + KV", languageStructureCode: "PERKATAAN", isPreparatory: false },
    { code: "KP22", sequence: 22, name: "Perkataan KVKK + KVK", languageStructureCode: "PERKATAAN", isPreparatory: false },
    { code: "KP23", sequence: 23, name: "Perkataan KVKK + KVKK", languageStructureCode: "PERKATAAN", isPreparatory: false },
    { code: "KP24", sequence: 24, name: "Perkataan KV + KV + KVKK", languageStructureCode: "PERKATAAN", isPreparatory: false },
    { code: "KP25", sequence: 25, name: "Perkataan KV + KVK + KVKK", languageStructureCode: "PERKATAAN", isPreparatory: false },
    { code: "KP26", sequence: 26, name: "Perkataan KVK + KV + KVKK", languageStructureCode: "PERKATAAN", isPreparatory: false },
    { code: "KP27", sequence: 27, name: "Perkataan KVKK + KV + KVK", languageStructureCode: "PERKATAAN", isPreparatory: false },
    { code: "KP28", sequence: 28, name: "Perkataan KV + KVKK + KVK", languageStructureCode: "PERKATAAN", isPreparatory: false },
    { code: "KP29", sequence: 29, name: "Perkataan yang melibatkan diftong dan vokal berganding", languageStructureCode: "PERKATAAN", isPreparatory: false },
    { code: "KP30", sequence: 30, name: "Perkataan yang melibatkan huruf konsonan bergabung (digraf)", languageStructureCode: "PERKATAAN", isPreparatory: false },
    { code: "KP31", sequence: 31, name: "Membaca dan membina ayat mudah", languageStructureCode: "AYAT", isPreparatory: false },
    { code: "KP32", sequence: 32, name: "Bacaan dan pemahaman", languageStructureCode: "AYAT", isPreparatory: false },
  ],
};
