import { CurriculumDomain } from "@prisma/client";

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

export interface CurriculumSeedLearningStandard {
  code: string;
  description: string;
  sequence: number;
  status?: "ACTIVE";
  skillCodes: readonly string[];
}

export interface CurriculumSeedContentStandard {
  yearLevel: number;
  code: string;
  title: string;
  domain: CurriculumDomain;
  sequence: number;
  status?: "ACTIVE";
  learningStandards: readonly CurriculumSeedLearningStandard[];
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
  contentStandards: readonly CurriculumSeedContentStandard[];
}

const group1Skills = ["KP-PRA"] as const;
const group2Skills = ["KP01", "KP02", "KP03"] as const;
const group3Skills = ["KP04", "KP09", "KP17"] as const;
const group4Skills = [
  "KP05",
  "KP06",
  "KP07",
  "KP08",
  "KP10",
  "KP11",
  "KP12",
  "KP13",
  "KP14",
  "KP15",
  "KP16",
  "KP18",
  "KP19",
  "KP20",
  "KP21",
  "KP22",
  "KP23",
  "KP24",
  "KP25",
  "KP26",
  "KP27",
  "KP28",
  "KP29",
  "KP30",
] as const;
const group5Skills = ["KP31", "KP32"] as const;

const earlySkills = [...group1Skills, ...group2Skills, ...group3Skills] as const;
const wordSkills = [...group2Skills, ...group3Skills, ...group4Skills] as const;
const writingSkills = [...group3Skills, ...group4Skills, ...group5Skills] as const;
const advancedSkills = [...group4Skills, ...group5Skills] as const;

function learningStandard(
  code: string,
  description: string,
  sequence: number,
  skillCodes: readonly string[],
): CurriculumSeedLearningStandard {
  return { code, description, sequence, skillCodes };
}

function contentStandard(
  yearLevel: number,
  code: string,
  title: string,
  domain: CurriculumDomain,
  sequence: number,
  learningStandards: readonly CurriculumSeedLearningStandard[],
): CurriculumSeedContentStandard {
  return { yearLevel, code, title, domain, sequence, learningStandards };
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
  contentStandards: [
    contentStandard(1, "1.1", "Mendengar dan memberikan respons", CurriculumDomain.LISTENING_SPEAKING, 2, [
      learningStandard("1.1.1 (i)", "Mengajuk, dan menyebut perkataan, frasa dan ayat yang mengandungi pelbagai bunyi; vokal.", 1, earlySkills),
      learningStandard("1.1.1 (ii)", "Mengajuk, dan menyebut perkataan, frasa dan ayat yang mengandungi pelbagai bunyi; konsonan.", 2, earlySkills),
      learningStandard("1.1.1 (iii)", "Mengajuk dan menyebut perkataan, frasa dan ayat yang mengandungi pelbagai bunyi; diftong.", 3, group2Skills),
      learningStandard("1.1.1 (iv)", "Mengajuk dan menyebut perkataan, frasa dan ayat yang mengandungi pelbagai bunyi; vokal berganding.", 4, group2Skills),
      learningStandard("1.1.1 (v)", "Mengajuk dan menyebut perkataan, frasa dan ayat yang mengandungi pelbagai bunyi; digraf.", 5, group3Skills),
      learningStandard("1.1.1 (vi)", "Mengajuk dan menyebut perkataan, frasa dan ayat yang mengandungi pelbagai bunyi; konsonan bergabung.", 6, group3Skills),
      learningStandard("1.1.2 (i)", "Mendengar, memahami dan memberikan respons terhadap; soalan.", 7, group3Skills),
      learningStandard("1.1.2 (ii)", "Mendengar, memahami dan memberikan respons terhadap; suruhan.", 8, group3Skills),
      learningStandard("1.1.2 (iii)", "Mendengar, memahami dan memberikan respons terhadap; pesanan.", 9, group3Skills),
    ]),
    contentStandard(1, "1.2", "Bertutur untuk menyampaikan maklumat dan idea bagi pelbagai tujuan", CurriculumDomain.LISTENING_SPEAKING, 3, [
      learningStandard("1.2.1", "Bertutur dengan sebutan yang betul dan intonasi secara bertatasusila.", 1, earlySkills),
      learningStandard("1.2.2", "Menyampaikan maklumat daripada bahan.", 2, group2Skills),
    ]),
    contentStandard(1, "2.1", "Asas membaca", CurriculumDomain.READING, 1, [
      learningStandard("2.1.1 (I)", "Membaca perkataan asas", 1, ["KP01"]),
      learningStandard("2.1.1 (ii)", "Membaca dengan sebutan yang betul; konsonan.", 2, group2Skills),
      learningStandard("2.1.1 (iii)", "Membaca dengan sebutan yang betul; suku kata.", 3, group3Skills),
      learningStandard("2.1.1 (iv)", "Membaca dengan sebutan yang betul; frasa.", 4, group3Skills),
      learningStandard("2.1.1 (v)", "Membaca dengan sebutan yang betul; perkataan.", 5, group4Skills),
      learningStandard("2.1.1 (vi)", "Membaca dengan sebutan yang betul; ayat.", 6, group4Skills),
      learningStandard("2.1.2 (i)", "Membaca dengan sebutan yang betul, intonasi yang sesuai dan memahami; perkataan dua suku kata dan tiga suku kata.", 7, group4Skills),
      learningStandard("2.1.2 (ii)", "Membaca dengan sebutan yang betul, intonasi yang sesuai dan memahami; frasa.", 8, group4Skills),
      learningStandard("2.1.2 (iii)", "Membaca dengan sebutan yang betul, intonasi yang sesuai dan memahami; ayat.", 9, group4Skills),
    ]),
    contentStandard(1, "2.2", "Membaca, memahami dan menaakul bahan grafik dan bukan grafik", CurriculumDomain.READING, 4, [
      learningStandard("2.2.1 (i)", "Membaca, memahami dan menaakul bahan untuk mendapatkan; kosa kata.", 1, group4Skills),
      learningStandard("2.2.1 (ii)", "Membaca, memahami dan menaakul bahan untuk mendapatkan; idea tersurat.", 2, group4Skills),
    ]),
    contentStandard(1, "2.3", "Membaca dan mengapresiasi karya sastera dan bukan sastera", CurriculumDomain.READING, 5, [
      learningStandard("2.3.1 (i)", "Membaca dan mengenal pasti kandungan teks bahan sastera dan bukan sastera; cerita.", 1, group4Skills),
      learningStandard("2.3.1 (ii)", "Membaca dan mengenal pasti kandungan teks bahan sastera dan bukan sastera; pantun.", 2, group4Skills),
      learningStandard("2.3.1 (iii)", "Membaca dan mengenal pasti kandungan teks bahan sastera dan bukan sastera; lagu kanak-kanak.", 3, group4Skills),
    ]),
    contentStandard(1, "3.1", "Asas menulis", CurriculumDomain.WRITING, 6, [
      learningStandard("3.1.1 (v)", "Menulis secara mekanis; ayat.", 1, group3Skills),
    ]),
    contentStandard(1, "3.2", "Menulis perkataan, frasa, dan ayat yang bermakna", CurriculumDomain.WRITING, 7, [
      learningStandard("3.2.1 (iii)", "Membina dan menulis; ayat.", 1, group4Skills),
      learningStandard("3.2.2 (i)", "Membina dan menulis jawapan pemahaman berdasarkan soalan; bertumpu.", 2, group4Skills),
      learningStandard("3.2.3", "Mencatat maklumat tentang sesuatu perkara.", 3, group4Skills),
      learningStandard("3.2.4 (iii)", "Menulis sesuatu yang diimlakkan; ayat.", 4, group4Skills),
    ]),
    contentStandard(1, "3.3", "Menghasilkan penulisan", CurriculumDomain.WRITING, 8, [
      learningStandard("3.3.1 (i)", "Menghasilkan penulisan naratif dan bukan naratif secara; terkawal.", 1, group4Skills),
      learningStandard("3.3.2 (i)", "Mengedit dan memurnikan hasil penulisan daripada aspek; ejaan.", 2, group4Skills),
      learningStandard("3.3.2 (ii)", "Mengedit dan memurnikan hasil penulisan daripada aspek; tanda baca.", 3, group4Skills),
    ]),
    contentStandard(1, "4.2", "Menghayati keindahan dan kesantunan bahasa dalam bahan sastera", CurriculumDomain.LANGUAGE_ARTS, 9, [
      learningStandard("4.2.1 (i)", "Melafazkan pantun dengan intonasi yang betul; pantun dua kerat.", 1, group4Skills),
      learningStandard("4.2.1 (ii)", "Melafazkan pantun dengan intonasi yang betul; pantun empat kerat.", 2, group4Skills),
      learningStandard("4.2.2 (i)", "Menyanyikan lagu dengan sebutan dan intonasi yang betul; lagu kanak-kanak.", 3, group5Skills),
      learningStandard("4.2.2 (ii)", "Menyanyikan lagu dengan sebutan dan intonasi yang betul; lagu rakyat.", 4, group5Skills),
    ]),
    contentStandard(1, "4.3", "Menghasilkan bahan sastera secara kreatif", CurriculumDomain.LANGUAGE_ARTS, 10, [
      learningStandard("4.3.2 (i)", "Mempersembahkan cerita; cerita haiwan.", 1, group5Skills),
      learningStandard("4.3.2 (ii)", "Mempersembahkan cerita; cerita jenaka.", 2, group5Skills),
      learningStandard("4.3.3 (i)", "Mempersembahkan lagu; kanak-kanak.", 3, group5Skills),
      learningStandard("4.3.3 (ii)", "Mempersembahkan lagu; rakyat.", 4, group5Skills),
    ]),
    contentStandard(1, "5.1", "Memahami fungsi dan menggunakan golongan kata", CurriculumDomain.GRAMMAR, 11, [
      learningStandard("5.1.1 (i)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata nama am.", 1, group4Skills),
      learningStandard("5.1.1 (ii)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata nama khas.", 2, group4Skills),
      learningStandard("5.1.1 (iii)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata ganti nama.", 3, group4Skills),
      learningStandard("5.1.1 (iv)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata adjektif.", 4, group4Skills),
      learningStandard("5.1.3 (i)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata tugas.", 5, group4Skills),
      learningStandard("5.1.3 (ii)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata hubung.", 6, group4Skills),
      learningStandard("5.1.3 (iii)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata sendi nama.", 7, group4Skills),
      learningStandard("5.1.3 (iv)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata seru.", 8, group4Skills),
      learningStandard("5.1.3 (v)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata tanya.", 9, group4Skills),
      learningStandard("5.1.4 (i)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata perintah.", 10, group4Skills),
      learningStandard("5.1.4 (ii)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata penguat.", 11, group4Skills),
      learningStandard("5.1.4 (iii)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata bantu.", 12, group4Skills),
      learningStandard("5.1.4 (iv)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata pemeri.", 13, group4Skills),
      learningStandard("5.1.4 (v)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata nafi.", 14, group4Skills),
      learningStandard("5.1.4 (vi)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata arah.", 15, group4Skills),
    ]),
    contentStandard(1, "5.2", "Memahami dan menggunakan pembentukan kata", CurriculumDomain.GRAMMAR, 12, [
      learningStandard("5.2.1 (i)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata dasar.", 1, group4Skills),
      learningStandard("5.2.1 (ii)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata tunggal.", 2, group4Skills),
      learningStandard("5.2.2 (i)", "Memahami, mengenal pasti dan menggunakan kata majmuk mengikut konteks; kata majmuk rangkai kata bebas.", 3, group4Skills),
    ]),
    contentStandard(1, "5.3", "Memahami dan membina ayat mengikut konteks", CurriculumDomain.GRAMMAR, 13, [
      learningStandard("5.3.1 (i)", "Memahami dan mengenal pasti jenis ayat mengikut konteks; ayat penyata.", 1, group4Skills),
      learningStandard("5.3.1 (ii)", "Memahami dan mengenal pasti jenis ayat mengikut konteks; ayat tanya dengan kata tanya.", 2, group4Skills),
      learningStandard("5.3.2 (i)", "Memahami, mengenal pasti dan menggunakan bentuk ayat mengikut konteks; ayat tunggal.", 3, group4Skills),
      learningStandard("5.3.2 (ii)", "Memahami, mengenal pasti dan menggunakan bentuk ayat mengikut konteks; ayat majmuk.", 4, group4Skills),
    ]),

    contentStandard(2, "1.1", "Mendengar dan memberikan respons", CurriculumDomain.LISTENING_SPEAKING, 1, [
      learningStandard("1.1.1 (i)", "Mendengar, mengecam, memahami dan menyebut dengan betul dan tepat; frasa.", 1, earlySkills),
      learningStandard("1.1.1 (ii)", "Mendengar, mengecam, memahami dan menyebut dengan betul dan tepat; ayat tunggal.", 2, earlySkills),
      learningStandard("1.1.1 (iii)", "Mendengar, mengecam, memahami dan menyebut dengan betul dan tepat; ayat majmuk.", 3, group2Skills),
      learningStandard("1.1.2 (i)", "Mendengar, memahami dan memberikan respons terhadap; soalan.", 4, group2Skills),
      learningStandard("1.1.2 (ii)", "Mendengar, memahami dan memberikan respons terhadap; suruhan.", 5, group2Skills),
      learningStandard("1.1.2 (iii)", "Mendengar, memahami dan memberikan respons terhadap; pesanan.", 6, group2Skills),
      learningStandard("1.1.2 (iv)", "Mendengar, memahami dan memberikan respons terhadap; permintaan.", 7, group2Skills),
      learningStandard("1.1.3 (i)", "Mendengar dan memberikan respons tafsiran terhadap; soalan bercapah.", 8, group2Skills),
    ]),
    contentStandard(2, "1.2", "Bertutur untuk menyampaikan maklumat dan idea bagi pelbagai tujuan", CurriculumDomain.LISTENING_SPEAKING, 2, [
      learningStandard("1.2.1", "Bertutur untuk menjelaskan sesuatu perkara secara bertatasusila mengikut konteks.", 1, group2Skills),
      learningStandard("1.2.2", "Bertutur dan menjelaskan maklumat yang tersurat dan tersirat dengan menggunakan idea yang kritis dan kreatif.", 2, group2Skills),
    ]),
    contentStandard(2, "2.1", "Asas membaca dan memahami", CurriculumDomain.READING, 3, [
      learningStandard("2.1.1 (i)", "Membaca dengan sebutan yang betul dan intonasi yang sesuai; perkataan.", 1, group4Skills),
      learningStandard("2.1.1 (ii)", "Membaca dengan sebutan yang betul dan intonasi yang sesuai; ayat.", 2, group4Skills),
      learningStandard("2.1.2 (i)", "Membaca dan memahami; perkataan.", 3, group4Skills),
      learningStandard("2.1.2 (ii)", "Membaca dan memahami; ayat.", 4, group4Skills),
    ]),
    contentStandard(2, "2.2", "Membaca, memahami dan menaakul bahan grafik dan bukan grafik", CurriculumDomain.READING, 4, [
      learningStandard("2.2.1 (i)", "Membaca, memahami dan mengenal pasti; kosa kata.", 1, group4Skills),
      learningStandard("2.2.1 (ii)", "Membaca, memahami dan mengenal pasti; isi tersurat.", 2, group4Skills),
      learningStandard("2.2.1 (iv)", "Membaca, memahami dan mengenal pasti; idea utama.", 3, group4Skills),
    ]),
    contentStandard(2, "2.3", "Membaca dan mengapresiasi karya sastera dan bukan sastera", CurriculumDomain.READING, 5, [
      learningStandard("2.3.1 (i)", "Membaca, mengenal pasti dan menyatakan nilai daripada bahan sastera dan bahan bukan sastera; lagu kanak-kanak.", 1, group4Skills),
      learningStandard("2.3.1 (ii)", "Membaca, mengenal pasti dan menyatakan nilai daripada bahan sastera dan bahan bukan sastera; cerita.", 2, group4Skills),
      learningStandard("2.3.1 (iii)", "Membaca, mengenal pasti dan menyatakan nilai daripada bahan sastera dan bahan bukan sastera; pantun.", 3, group4Skills),
      learningStandard("2.3.1 (iv)", "Membaca, mengenal pasti dan menyatakan nilai daripada bahan sastera dan bahan bukan sastera; petikan.", 4, group4Skills),
      learningStandard("2.3.2 (i)", "Membaca dan mempersembahkan karya sastera dan bukan sastera dengan sebutan yang betul dan intonasi yang sesuai; lagu kanak-kanak.", 5, group4Skills),
      learningStandard("2.3.2 (ii)", "Membaca dan mempersembahkan karya sastera dan bukan sastera dengan sebutan yang betul dan intonasi yang sesuai; lagu rakyat.", 6, group4Skills),
      learningStandard("2.3.2 (iii)", "Membaca dan mempersembahkan karya sastera dan bukan sastera dengan sebutan yang betul dan intonasi yang sesuai; cerita.", 7, group4Skills),
      learningStandard("2.3.2 (iv)", "Membaca dan mempersembahkan karya sastera dan bukan sastera dengan sebutan yang betul dan intonasi yang sesuai; pantun.", 8, group4Skills),
    ]),
    contentStandard(2, "3.1", "Asas menulis", CurriculumDomain.WRITING, 6, [
      learningStandard("3.1.1 (ii)", "Menulis secara mekanis; ayat.", 1, group3Skills),
      learningStandard("3.1.1 (iii)", "Menulis secara mekanis; perenggan.", 2, group3Skills),
      learningStandard("3.1.1 (iv)", "Menulis secara mekanis; petikan.", 3, group4Skills),
    ]),
    contentStandard(2, "3.2", "Menulis perkataan, frasa, dan ayat yang bermakna", CurriculumDomain.WRITING, 7, [
      learningStandard("3.2.1 (iii)", "Membina dan menulis; ayat.", 1, group4Skills),
      learningStandard("3.2.1 (iv)", "Membina dan menulis; perenggan.", 2, group4Skills),
      learningStandard("3.2.2 (i)", "Membina dan menulis jawapan pemahaman dengan berdasarkan soalan; bertumpu.", 3, group4Skills),
      learningStandard("3.2.2 (ii)", "Membina dan menulis jawapan pemahaman dengan berdasarkan soalan; bercapah.", 4, group4Skills),
      learningStandard("3.2.3", "Menyusun dan mencatat maklumat yang bermakna tentang sesuatu perkara.", 5, group4Skills),
      learningStandard("3.2.4 (iii)", "Menulis sesuatu yang diimlakkan; ayat.", 6, group4Skills),
    ]),
    contentStandard(2, "3.3", "Menghasilkan penulisan", CurriculumDomain.WRITING, 8, [
      learningStandard("3.3.1 (i)", "Menghasilkan penulisan naratif dan bukan naratif secara; separa terkawal.", 1, group4Skills),
      learningStandard("3.3.2 (i)", "Mengedit dan memurnikan hasil penulisan daripada aspek; ejaan.", 2, group4Skills),
      learningStandard("3.3.2 (ii)", "Mengedit dan memurnikan hasil penulisan daripada aspek; tanda baca.", 3, group4Skills),
      learningStandard("3.3.2 (iii)", "Mengedit dan memurnikan hasil penulisan daripada aspek; penggunaan kata.", 4, group4Skills),
    ]),
    contentStandard(2, "4.2", "Menghayati keindahan dan kesantunan bahasa dalam bahan sastera", CurriculumDomain.LANGUAGE_ARTS, 9, [
      learningStandard("4.2.2 (i)", "Menyanyikan lagu dengan sebutan yang betul dan intonasi yang sesuai serta melakukan aksi mengikut lirik; lagu kanak-kanak.", 1, group5Skills),
      learningStandard("4.2.2 (ii)", "Menyanyikan lagu dengan sebutan yang betul dan intonasi yang sesuai serta melakukan aksi mengikut lirik; lagu rakyat.", 2, group5Skills),
    ]),
    contentStandard(2, "4.3", "Menghasilkan bahan sastera secara kreatif", CurriculumDomain.LANGUAGE_ARTS, 10, [
      learningStandard("4.3.2 (i)", "Mempersembahkan cerita; cerita haiwan.", 1, group5Skills),
      learningStandard("4.3.2 (ii)", "Mempersembahkan cerita; cerita jenaka.", 2, group5Skills),
      learningStandard("4.3.3 (i)", "Mempersembahkan lagu; kanak-kanak.", 3, group5Skills),
      learningStandard("4.3.3 (ii)", "Mempersembahkan lagu; rakyat.", 4, group5Skills),
    ]),
    contentStandard(2, "5.1", "Memahami fungsi dan menggunakan golongan kata", CurriculumDomain.GRAMMAR, 11, [
      learningStandard("5.1.1 (i)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata dasar.", 1, advancedSkills),
      learningStandard("5.1.1 (ii)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata tunggal.", 2, advancedSkills),
      learningStandard("5.1.1 (iii)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata berimbuhan awalan.", 3, advancedSkills),
      learningStandard("5.1.1 (iv)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata berimbuhan akhiran.", 4, advancedSkills),
      learningStandard("5.1.3 (i)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata tugas.", 5, advancedSkills),
      learningStandard("5.1.3 (ii)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata hubung.", 6, advancedSkills),
      learningStandard("5.1.3 (iii)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata sendi nama.", 7, advancedSkills),
      learningStandard("5.1.3 (iv)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata seru.", 8, advancedSkills),
      learningStandard("5.1.3 (v)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata tanya.", 9, advancedSkills),
      learningStandard("5.1.4 (i)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata perintah.", 10, advancedSkills),
      learningStandard("5.1.4 (iii)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata bantu.", 11, advancedSkills),
      learningStandard("5.1.4 (iv)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata pemeri.", 12, advancedSkills),
      learningStandard("5.1.4 (v)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata nafi.", 13, advancedSkills),
      learningStandard("5.1.4 (vi)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata arah.", 14, advancedSkills),
    ]),
    contentStandard(2, "5.2", "Memahami dan menggunakan pembentukan kata", CurriculumDomain.GRAMMAR, 12, [
      learningStandard("5.2.1 (i)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata dasar.", 1, advancedSkills),
      learningStandard("5.2.1 (ii)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata tunggal.", 2, advancedSkills),
      learningStandard("5.2.1 (iii)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata berimbuhan awalan.", 3, advancedSkills),
      learningStandard("5.2.1 (iv)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata berimbuhan akhiran.", 4, advancedSkills),
      learningStandard("5.2.2 (i)", "Memahami, mengenal pasti dan menggunakan kata majmuk mengikut konteks; kata majmuk rangkai kata bebas.", 5, advancedSkills),
    ]),
    contentStandard(2, "5.3", "Memahami dan membina ayat mengikut konteks", CurriculumDomain.GRAMMAR, 13, [
      learningStandard("5.3.1", "Memahami dan membina ayat dasar menggunakan pola ayat FN + FN, FN + FK, FN + FA, FN + FS dengan betul dalam pelbagai konteks.", 1, advancedSkills),
      learningStandard("5.3.2", "Memahami dan membina ayat penyata dengan menggunakan tanda baca yang betul dalam pelbagai konteks.", 2, advancedSkills),
    ]),

    contentStandard(3, "1.1", "Mendengar dan memberikan respons", CurriculumDomain.LISTENING_SPEAKING, 1, [
      learningStandard("1.1.1 (i)", "Mendengar, mengecam sebutan, memahami dan menyebut dengan betul dan tepat; ayat tunggal.", 1, earlySkills),
      learningStandard("1.1.1 (ii)", "Mendengar, mengecam sebutan, memahami dan menyebut dengan betul dan tepat; ayat majmuk.", 2, earlySkills),
      learningStandard("1.1.2 (i)", "Mendengar, memahami dan memberikan respons terhadap; suruhan dan permintaan.", 3, earlySkills),
      learningStandard("1.1.2 (ii)", "Mendengar, memahami dan memberikan respons terhadap; silaan dan larangan.", 4, earlySkills),
      learningStandard("1.1.3 (i)", "Mendengar, mentafsir, dan memberikan respons terhadap; soalan bertumpu.", 5, earlySkills),
      learningStandard("1.1.3 (ii)", "Mendengar, mentafsir, dan memberikan respons terhadap; soalan bercapah.", 6, earlySkills),
    ]),
    contentStandard(3, "1.2", "Bertutur untuk menyampaikan maklumat dan idea bagi pelbagai tujuan", CurriculumDomain.LISTENING_SPEAKING, 2, [
      learningStandard("1.2.1", "Bertutur untuk menjelaskan dan menilai sesuatu perkara secara bertatasusila mengikut konteks.", 1, group2Skills),
      learningStandard("1.2.2", "Menjelaskan dan membanding beza maklumat tersurat dengan menggunakan idea yang kritis dan kreatif.", 2, group2Skills),
      learningStandard("1.2.3", "Bersoal jawab untuk mendapatkan dan menyampaikan maklumat.", 3, group4Skills),
    ]),
    contentStandard(3, "2.1", "Asas membaca dan memahami", CurriculumDomain.READING, 3, [
      learningStandard("2.1.1 (i)", "Membaca dengan sebutan yang betul dan intonasi yang sesuai; ayat tunggal dan ayat majmuk.", 1, advancedSkills),
      learningStandard("2.1.1 (ii)", "Membaca dengan sebutan yang betul dan intonasi yang sesuai; perenggan.", 2, advancedSkills),
      learningStandard("2.1.1 (iii)", "Membaca dengan sebutan yang betul dan intonasi yang sesuai; petikan.", 3, advancedSkills),
      learningStandard("2.1.2 (i)", "Membaca dengan sebutan yang betul, intonasi yang sesuai dan memahami; pelbagai jenis ayat.", 4, advancedSkills),
      learningStandard("2.1.2 (ii)", "Membaca dengan sebutan yang betul, intonasi yang sesuai dan memahami; perenggan.", 5, advancedSkills),
      learningStandard("2.1.2 (iii)", "Membaca dengan sebutan yang betul, intonasi yang sesuai dan memahami; petikan.", 6, advancedSkills),
    ]),
    contentStandard(3, "2.2", "Membaca, memahami dan menaakul bahan grafik dan bukan grafik", CurriculumDomain.READING, 4, [
      learningStandard("2.2.1 (i)", "Membaca, memahami dan mengecam; maksud kosa kata.", 1, advancedSkills),
      learningStandard("2.2.1 (ii)", "Membaca, memahami dan mengecam; idea utama dan idea sampingan.", 2, advancedSkills),
    ]),
    contentStandard(3, "2.3", "Membaca dan mengapresiasi karya sastera dan bukan sastera", CurriculumDomain.READING, 5, [
      learningStandard("2.3.1 (i)", "Membaca dan mengenal pasti kandungan teks bahan sastera dan bukan sastera; cerita.", 1, advancedSkills),
      learningStandard("2.3.1 (ii)", "Membaca dan mengenal pasti kandungan teks bahan sastera dan bukan sastera; pantun.", 2, advancedSkills),
      learningStandard("2.3.1 (iii)", "Membaca dan mengenal pasti kandungan teks bahan sastera dan bukan sastera; lagu kanak-kanak.", 3, advancedSkills),
      learningStandard("2.3.1 (iv)", "Membaca dan mengenal pasti kandungan teks bahan sastera dan bukan sastera; petikan.", 4, advancedSkills),
      learningStandard("2.3.2 (i)", "Membaca dan mempersembahkan karya sastera dan bukan sastera dengan sebutan yang betul dan intonasi yang sesuai; cerita.", 5, advancedSkills),
      learningStandard("2.3.2 (ii)", "Membaca dan mempersembahkan karya sastera dan bukan sastera dengan sebutan yang betul dan intonasi yang sesuai; pantun.", 6, advancedSkills),
      learningStandard("2.3.2 (iii)", "Membaca dan mempersembahkan karya sastera dan bukan sastera dengan sebutan yang betul dan intonasi yang sesuai; cerita.", 7, advancedSkills),
      learningStandard("2.3.2 (iv)", "Membaca dan mempersembahkan karya sastera dan bukan sastera dengan sebutan yang betul dan intonasi yang sesuai; pantun.", 8, advancedSkills),
    ]),
    contentStandard(3, "3.1", "Asas menulis", CurriculumDomain.WRITING, 6, [
      learningStandard("3.1.1 (i)", "Menulis secara mekanis; ayat tunggal.", 1, group3Skills),
      learningStandard("3.1.1 (ii)", "Menulis secara mekanis; ayat majmuk.", 2, group3Skills),
    ]),
    contentStandard(3, "3.2", "Menulis perkataan, frasa, dan ayat yang bermakna", CurriculumDomain.WRITING, 7, [
      learningStandard("3.2.1 (i)", "Membina dan menulis; ayat.", 1, advancedSkills),
      learningStandard("3.2.1 (ii)", "Membina dan menulis; perenggan.", 2, advancedSkills),
      learningStandard("3.2.2 (i)", "Menghasilkan jawapan pemahaman berdasarkan soalan; bertumpu.", 3, advancedSkills),
      learningStandard("3.2.2 (ii)", "Menghasilkan jawapan pemahaman berdasarkan soalan; bercapah.", 4, advancedSkills),
      learningStandard("3.2.3", "Membanding bezakan dan mencatat maklumat tentang sesuatu perkara.", 5, advancedSkills),
      learningStandard("3.2.4 (i)", "Menulis sesuatu yang diimlakkan; ayat.", 6, advancedSkills),
    ]),
    contentStandard(3, "3.3", "Menghasilkan penulisan", CurriculumDomain.WRITING, 8, [
      learningStandard("3.3.1 (i)", "Menghasilkan penulisan naratif dan bukan naratif secara; berpandu.", 1, advancedSkills),
      learningStandard("3.3.1 (ii)", "Menghasilkan kerangka dan penulisan karangan naratif, dan bukan naratif secara; berpandu.", 2, advancedSkills),
      learningStandard("3.3.2 (i)", "Mengedit dan memurnikan hasil penulisan daripada aspek; ejaan.", 3, advancedSkills),
      learningStandard("3.3.2 (ii)", "Mengedit dan memurnikan hasil penulisan daripada aspek; tanda baca.", 4, advancedSkills),
    ]),
    contentStandard(3, "4.2", "Menghayati keindahan dan kesantunan bahasa dalam bahan sastera", CurriculumDomain.LANGUAGE_ARTS, 9, [
      learningStandard("4.2.1", "Melafazkan pantun yang mengandungi bahasa yang indah dan menjelaskan maksud.", 1, advancedSkills),
      learningStandard("4.2.2", "Menyanyikan lagu mengikut irama lagu kanak-kanak dan lagu rakyat serta menjelaskan maksud bahasa yang indah dalam lirik lagu.", 2, advancedSkills),
    ]),
    contentStandard(3, "4.3", "Menghasilkan bahan sastera secara kreatif", CurriculumDomain.LANGUAGE_ARTS, 10, [
      learningStandard("4.3.2 (i)", "Mempersembahkan cerita; cerita haiwan.", 1, advancedSkills),
      learningStandard("4.3.2 (ii)", "Mempersembahkan cerita; cerita jenaka.", 2, advancedSkills),
      learningStandard("4.3.3 (i)", "Mempersembahkan lagu; kanak-kanak.", 3, advancedSkills),
      learningStandard("4.3.3 (ii)", "Mempersembahkan lagu; rakyat.", 4, advancedSkills),
    ]),
    contentStandard(3, "5.1", "Memahami fungsi dan menggunakan golongan kata", CurriculumDomain.GRAMMAR, 11, [
      learningStandard("5.1.1 (i)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata dasar.", 1, advancedSkills),
      learningStandard("5.1.1 (ii)", "Memahami, mengenal pasti dan menggunakan kata mengikut konteks; kata tunggal.", 2, advancedSkills),
      learningStandard("5.1.1 (iii)", "Memahami dan menggunakan kata mengikut konteks; kata berimbuhan awalan.", 3, advancedSkills),
      learningStandard("5.1.1 (iv)", "Memahami dan menggunakan kata mengikut konteks; kata berimbuhan akhiran.", 4, advancedSkills),
      learningStandard("5.1.3 (i)", "Memahami dan menggunakan kata mengikut konteks; kata tugas.", 5, advancedSkills),
      learningStandard("5.1.3 (ii)", "Memahami dan menggunakan kata mengikut konteks; kata hubung.", 6, advancedSkills),
      learningStandard("5.1.3 (iii)", "Memahami dan menggunakan kata mengikut konteks; kata sendi nama.", 7, advancedSkills),
      learningStandard("5.1.4 (i)", "Memahami dan menggunakan kata mengikut konteks; kata perintah.", 8, advancedSkills),
      learningStandard("5.1.4 (iii)", "Memahami dan menggunakan kata mengikut konteks; kata bantu.", 9, advancedSkills),
      learningStandard("5.1.4 (iv)", "Memahami dan menggunakan kata mengikut konteks; kata pemeri.", 10, advancedSkills),
      learningStandard("5.1.4 (v)", "Memahami dan menggunakan kata mengikut konteks; kata nafi.", 11, advancedSkills),
    ]),
    contentStandard(3, "5.2", "Memahami dan menggunakan pembentukan kata", CurriculumDomain.GRAMMAR, 12, [
      learningStandard("5.2.1 (ii)", "Memahami dan menggunakan kata mengikut konteks; kata berimbuhan awalan.", 1, advancedSkills),
      learningStandard("5.2.1 (iii)", "Memahami dan menggunakan kata mengikut konteks; kata berimbuhan akhiran.", 2, advancedSkills),
      learningStandard("5.2.2", "Memahami dan menggunakan kata majmuk mengikut konteks.", 3, advancedSkills),
    ]),
    contentStandard(3, "5.3", "Memahami dan membina ayat mengikut konteks", CurriculumDomain.GRAMMAR, 13, [
      learningStandard("5.3.1", "Memahami dan membina ayat tunggal susunan biasa dan ayat majmuk dengan betul dalam pelbagai situasi.", 1, advancedSkills),
      learningStandard("5.3.2", "Memahami dan membina ayat penyata, ayat tanya dengan kata tanya dan tanpa kata tanya, ayat seru dan ayat perintah dengan betul dalam pelbagai situasi.", 2, advancedSkills),
    ]),
  ],
};
