// ============================================================
// Section Library — Static reference data for structural steel
// profiles per EN 10365 (HEA/HEB/IPE/UPN) and DIN (Angles)
// ============================================================

export interface SectionProps {
  designation: string;       // e.g. 'HEA 100'
  profileType: string;       // e.g. 'HEA'
  standard: string;          // e.g. 'EN10365'
  h_mm: number;              // Total height
  b_mm: number;              // Flange width
  tf_mm: number;             // Flange thickness
  tw_mm: number;             // Web thickness
  r_mm: number;              // Root fillet radius
  weight_kg_per_m: number;   // kg/m
  area_cm2: number;          // Cross-section area
  Ix_cm4: number;            // Second moment of area — major axis
  Iy_cm4: number;            // Second moment of area — minor axis
  Wx_cm3: number;            // Section modulus — major axis
  Wy_cm3: number;            // Section modulus — minor axis
  ix_cm: number;             // Radius of gyration — major axis
  iy_cm: number;             // Radius of gyration — minor axis
}

// ── HEA Sections (EN 10365) ──────────────────────────────────────────────
export const HEA_SECTIONS: SectionProps[] = [
  {
    designation: 'HEA 100', profileType: 'HEA', standard: 'EN10365',
    h_mm: 96,   b_mm: 100,  tf_mm: 8.0,  tw_mm: 5.0,  r_mm: 12,
    weight_kg_per_m: 16.7,  area_cm2: 21.2,
    Ix_cm4: 349,   Iy_cm4: 134,   Wx_cm3: 72.8,  Wy_cm3: 26.8,  ix_cm: 4.06, iy_cm: 2.51,
  },
  {
    designation: 'HEA 120', profileType: 'HEA', standard: 'EN10365',
    h_mm: 114,  b_mm: 120,  tf_mm: 8.0,  tw_mm: 5.0,  r_mm: 12,
    weight_kg_per_m: 19.9,  area_cm2: 25.3,
    Ix_cm4: 606,   Iy_cm4: 231,   Wx_cm3: 106,   Wy_cm3: 38.5,  ix_cm: 4.89, iy_cm: 3.02,
  },
  {
    designation: 'HEA 140', profileType: 'HEA', standard: 'EN10365',
    h_mm: 133,  b_mm: 140,  tf_mm: 8.5,  tw_mm: 5.5,  r_mm: 12,
    weight_kg_per_m: 24.7,  area_cm2: 31.4,
    Ix_cm4: 1033,  Iy_cm4: 389,   Wx_cm3: 155,   Wy_cm3: 55.6,  ix_cm: 5.73, iy_cm: 3.52,
  },
  {
    designation: 'HEA 160', profileType: 'HEA', standard: 'EN10365',
    h_mm: 152,  b_mm: 160,  tf_mm: 9.0,  tw_mm: 6.0,  r_mm: 15,
    weight_kg_per_m: 30.4,  area_cm2: 38.8,
    Ix_cm4: 1673,  Iy_cm4: 616,   Wx_cm3: 220,   Wy_cm3: 77.0,  ix_cm: 6.57, iy_cm: 3.98,
  },
  {
    designation: 'HEA 180', profileType: 'HEA', standard: 'EN10365',
    h_mm: 171,  b_mm: 180,  tf_mm: 9.5,  tw_mm: 6.0,  r_mm: 15,
    weight_kg_per_m: 35.5,  area_cm2: 45.3,
    Ix_cm4: 2510,  Iy_cm4: 925,   Wx_cm3: 294,   Wy_cm3: 103,   ix_cm: 7.45, iy_cm: 4.52,
  },
  {
    designation: 'HEA 200', profileType: 'HEA', standard: 'EN10365',
    h_mm: 190,  b_mm: 200,  tf_mm: 10.0, tw_mm: 6.5,  r_mm: 18,
    weight_kg_per_m: 42.3,  area_cm2: 53.8,
    Ix_cm4: 3692,  Iy_cm4: 1336,  Wx_cm3: 389,   Wy_cm3: 134,   ix_cm: 8.28, iy_cm: 4.98,
  },
  {
    designation: 'HEA 220', profileType: 'HEA', standard: 'EN10365',
    h_mm: 210,  b_mm: 220,  tf_mm: 11.0, tw_mm: 7.0,  r_mm: 18,
    weight_kg_per_m: 50.5,  area_cm2: 64.3,
    Ix_cm4: 5410,  Iy_cm4: 1955,  Wx_cm3: 515,   Wy_cm3: 178,   ix_cm: 9.17, iy_cm: 5.51,
  },
  {
    designation: 'HEA 240', profileType: 'HEA', standard: 'EN10365',
    h_mm: 230,  b_mm: 240,  tf_mm: 12.0, tw_mm: 7.5,  r_mm: 21,
    weight_kg_per_m: 60.3,  area_cm2: 76.8,
    Ix_cm4: 7763,  Iy_cm4: 2769,  Wx_cm3: 675,   Wy_cm3: 231,   ix_cm: 10.1, iy_cm: 6.00,
  },
  {
    designation: 'HEA 260', profileType: 'HEA', standard: 'EN10365',
    h_mm: 250,  b_mm: 260,  tf_mm: 12.5, tw_mm: 7.5,  r_mm: 24,
    weight_kg_per_m: 68.2,  area_cm2: 86.8,
    Ix_cm4: 10450, Iy_cm4: 3668,  Wx_cm3: 836,   Wy_cm3: 282,   ix_cm: 10.97,iy_cm: 6.50,
  },
  {
    designation: 'HEA 280', profileType: 'HEA', standard: 'EN10365',
    h_mm: 270,  b_mm: 280,  tf_mm: 13.0, tw_mm: 8.0,  r_mm: 24,
    weight_kg_per_m: 76.4,  area_cm2: 97.3,
    Ix_cm4: 13670, Iy_cm4: 4763,  Wx_cm3: 1013,  Wy_cm3: 340,   ix_cm: 11.86,iy_cm: 6.99,
  },
  {
    designation: 'HEA 300', profileType: 'HEA', standard: 'EN10365',
    h_mm: 290,  b_mm: 300,  tf_mm: 14.0, tw_mm: 8.5,  r_mm: 27,
    weight_kg_per_m: 88.3,  area_cm2: 112.5,
    Ix_cm4: 18260, Iy_cm4: 6310,  Wx_cm3: 1260,  Wy_cm3: 421,   ix_cm: 12.74,iy_cm: 7.49,
  },
  {
    designation: 'HEA 320', profileType: 'HEA', standard: 'EN10365',
    h_mm: 310,  b_mm: 300,  tf_mm: 15.5, tw_mm: 9.0,  r_mm: 27,
    weight_kg_per_m: 97.6,  area_cm2: 124.4,
    Ix_cm4: 22930, Iy_cm4: 6985,  Wx_cm3: 1479,  Wy_cm3: 466,   ix_cm: 13.58,iy_cm: 7.50,
  },
  {
    designation: 'HEA 340', profileType: 'HEA', standard: 'EN10365',
    h_mm: 330,  b_mm: 300,  tf_mm: 16.5, tw_mm: 9.5,  r_mm: 27,
    weight_kg_per_m: 105.0, area_cm2: 133.5,
    Ix_cm4: 27690, Iy_cm4: 7436,  Wx_cm3: 1678,  Wy_cm3: 496,   ix_cm: 14.40,iy_cm: 7.46,
  },
  {
    designation: 'HEA 360', profileType: 'HEA', standard: 'EN10365',
    h_mm: 350,  b_mm: 300,  tf_mm: 17.5, tw_mm: 10.0, r_mm: 27,
    weight_kg_per_m: 112.0, area_cm2: 142.8,
    Ix_cm4: 33090, Iy_cm4: 7887,  Wx_cm3: 1891,  Wy_cm3: 526,   ix_cm: 15.22,iy_cm: 7.43,
  },
  {
    designation: 'HEA 400', profileType: 'HEA', standard: 'EN10365',
    h_mm: 390,  b_mm: 300,  tf_mm: 19.0, tw_mm: 11.0, r_mm: 27,
    weight_kg_per_m: 125.0, area_cm2: 159.0,
    Ix_cm4: 45070, Iy_cm4: 8564,  Wx_cm3: 2311,  Wy_cm3: 571,   ix_cm: 16.84,iy_cm: 7.34,
  },
  {
    designation: 'HEA 450', profileType: 'HEA', standard: 'EN10365',
    h_mm: 440,  b_mm: 300,  tf_mm: 21.0, tw_mm: 11.5, r_mm: 27,
    weight_kg_per_m: 140.0, area_cm2: 178.0,
    Ix_cm4: 63720, Iy_cm4: 9465,  Wx_cm3: 2896,  Wy_cm3: 631,   ix_cm: 18.93,iy_cm: 7.29,
  },
  {
    designation: 'HEA 500', profileType: 'HEA', standard: 'EN10365',
    h_mm: 490,  b_mm: 300,  tf_mm: 23.0, tw_mm: 12.0, r_mm: 27,
    weight_kg_per_m: 155.0, area_cm2: 197.5,
    Ix_cm4: 86970, Iy_cm4: 10370, Wx_cm3: 3550,  Wy_cm3: 691,   ix_cm: 20.98,iy_cm: 7.24,
  },
  {
    designation: 'HEA 550', profileType: 'HEA', standard: 'EN10365',
    h_mm: 540,  b_mm: 300,  tf_mm: 24.0, tw_mm: 12.5, r_mm: 27,
    weight_kg_per_m: 166.0, area_cm2: 211.8,
    Ix_cm4: 111900,Iy_cm4: 10820, Wx_cm3: 4146,  Wy_cm3: 721,   ix_cm: 22.99,iy_cm: 7.15,
  },
  {
    designation: 'HEA 600', profileType: 'HEA', standard: 'EN10365',
    h_mm: 590,  b_mm: 300,  tf_mm: 25.0, tw_mm: 13.0, r_mm: 27,
    weight_kg_per_m: 178.0, area_cm2: 226.5,
    Ix_cm4: 141200,Iy_cm4: 11270, Wx_cm3: 4787,  Wy_cm3: 751,   ix_cm: 24.98,iy_cm: 7.05,
  },
  {
    designation: 'HEA 650', profileType: 'HEA', standard: 'EN10365',
    h_mm: 640,  b_mm: 300,  tf_mm: 26.0, tw_mm: 13.5, r_mm: 27,
    weight_kg_per_m: 190.0, area_cm2: 241.6,
    Ix_cm4: 175200,Iy_cm4: 11720, Wx_cm3: 5474,  Wy_cm3: 781,   ix_cm: 26.93,iy_cm: 6.97,
  },
  {
    designation: 'HEA 700', profileType: 'HEA', standard: 'EN10365',
    h_mm: 690,  b_mm: 300,  tf_mm: 27.0, tw_mm: 14.5, r_mm: 27,
    weight_kg_per_m: 204.0, area_cm2: 260.5,
    Ix_cm4: 215300,Iy_cm4: 12180, Wx_cm3: 6241,  Wy_cm3: 812,   ix_cm: 28.75,iy_cm: 6.84,
  },
  {
    designation: 'HEA 800', profileType: 'HEA', standard: 'EN10365',
    h_mm: 790,  b_mm: 300,  tf_mm: 28.0, tw_mm: 15.0, r_mm: 30,
    weight_kg_per_m: 224.0, area_cm2: 285.8,
    Ix_cm4: 303400,Iy_cm4: 12640, Wx_cm3: 7682,  Wy_cm3: 843,   ix_cm: 32.58,iy_cm: 6.65,
  },
  {
    designation: 'HEA 900', profileType: 'HEA', standard: 'EN10365',
    h_mm: 890,  b_mm: 300,  tf_mm: 30.0, tw_mm: 16.0, r_mm: 30,
    weight_kg_per_m: 252.0, area_cm2: 320.5,
    Ix_cm4: 422100,Iy_cm4: 13550, Wx_cm3: 9485,  Wy_cm3: 903,   ix_cm: 36.28,iy_cm: 6.50,
  },
  {
    designation: 'HEA 1000', profileType: 'HEA', standard: 'EN10365',
    h_mm: 990,  b_mm: 300,  tf_mm: 31.0, tw_mm: 16.5, r_mm: 30,
    weight_kg_per_m: 272.0, area_cm2: 346.8,
    Ix_cm4: 553800,Iy_cm4: 13980, Wx_cm3: 11190, Wy_cm3: 932,   ix_cm: 39.97,iy_cm: 6.35,
  },
];

// ── HEB Sections (EN 10365) ──────────────────────────────────────────────
export const HEB_SECTIONS: SectionProps[] = [
  {
    designation: 'HEB 100', profileType: 'HEB', standard: 'EN10365',
    h_mm: 100,  b_mm: 100,  tf_mm: 10.0, tw_mm: 6.0,  r_mm: 12,
    weight_kg_per_m: 20.4,  area_cm2: 26.0,
    Ix_cm4: 450,   Iy_cm4: 167,   Wx_cm3: 89.9,  Wy_cm3: 33.5,  ix_cm: 4.16, iy_cm: 2.53,
  },
  {
    designation: 'HEB 120', profileType: 'HEB', standard: 'EN10365',
    h_mm: 120,  b_mm: 120,  tf_mm: 11.0, tw_mm: 6.5,  r_mm: 12,
    weight_kg_per_m: 26.7,  area_cm2: 34.0,
    Ix_cm4: 864,   Iy_cm4: 318,   Wx_cm3: 144,   Wy_cm3: 52.9,  ix_cm: 5.04, iy_cm: 3.06,
  },
  {
    designation: 'HEB 140', profileType: 'HEB', standard: 'EN10365',
    h_mm: 140,  b_mm: 140,  tf_mm: 12.0, tw_mm: 7.0,  r_mm: 12,
    weight_kg_per_m: 33.7,  area_cm2: 43.0,
    Ix_cm4: 1509,  Iy_cm4: 550,   Wx_cm3: 216,   Wy_cm3: 78.5,  ix_cm: 5.93, iy_cm: 3.58,
  },
  {
    designation: 'HEB 160', profileType: 'HEB', standard: 'EN10365',
    h_mm: 160,  b_mm: 160,  tf_mm: 13.0, tw_mm: 8.0,  r_mm: 15,
    weight_kg_per_m: 42.6,  area_cm2: 54.3,
    Ix_cm4: 2492,  Iy_cm4: 889,   Wx_cm3: 311,   Wy_cm3: 111,   ix_cm: 6.78, iy_cm: 4.05,
  },
  {
    designation: 'HEB 180', profileType: 'HEB', standard: 'EN10365',
    h_mm: 180,  b_mm: 180,  tf_mm: 14.0, tw_mm: 8.5,  r_mm: 15,
    weight_kg_per_m: 51.2,  area_cm2: 65.3,
    Ix_cm4: 3831,  Iy_cm4: 1363,  Wx_cm3: 426,   Wy_cm3: 151,   ix_cm: 7.66, iy_cm: 4.57,
  },
  {
    designation: 'HEB 200', profileType: 'HEB', standard: 'EN10365',
    h_mm: 200,  b_mm: 200,  tf_mm: 15.0, tw_mm: 9.0,  r_mm: 18,
    weight_kg_per_m: 61.3,  area_cm2: 78.1,
    Ix_cm4: 5696,  Iy_cm4: 2003,  Wx_cm3: 570,   Wy_cm3: 200,   ix_cm: 8.54, iy_cm: 5.07,
  },
  {
    designation: 'HEB 220', profileType: 'HEB', standard: 'EN10365',
    h_mm: 220,  b_mm: 220,  tf_mm: 16.0, tw_mm: 9.5,  r_mm: 18,
    weight_kg_per_m: 71.5,  area_cm2: 91.0,
    Ix_cm4: 8091,  Iy_cm4: 2843,  Wx_cm3: 736,   Wy_cm3: 258,   ix_cm: 9.43, iy_cm: 5.59,
  },
  {
    designation: 'HEB 240', profileType: 'HEB', standard: 'EN10365',
    h_mm: 240,  b_mm: 240,  tf_mm: 17.0, tw_mm: 10.0, r_mm: 21,
    weight_kg_per_m: 83.2,  area_cm2: 106.0,
    Ix_cm4: 11260, Iy_cm4: 3923,  Wx_cm3: 938,   Wy_cm3: 327,   ix_cm: 10.31,iy_cm: 6.08,
  },
  {
    designation: 'HEB 260', profileType: 'HEB', standard: 'EN10365',
    h_mm: 260,  b_mm: 260,  tf_mm: 17.5, tw_mm: 10.0, r_mm: 24,
    weight_kg_per_m: 93.0,  area_cm2: 118.4,
    Ix_cm4: 14920, Iy_cm4: 5135,  Wx_cm3: 1148,  Wy_cm3: 395,   ix_cm: 11.22,iy_cm: 6.58,
  },
  {
    designation: 'HEB 280', profileType: 'HEB', standard: 'EN10365',
    h_mm: 280,  b_mm: 280,  tf_mm: 18.0, tw_mm: 10.5, r_mm: 24,
    weight_kg_per_m: 103.0, area_cm2: 131.4,
    Ix_cm4: 19270, Iy_cm4: 6595,  Wx_cm3: 1376,  Wy_cm3: 471,   ix_cm: 12.11,iy_cm: 7.09,
  },
  {
    designation: 'HEB 300', profileType: 'HEB', standard: 'EN10365',
    h_mm: 300,  b_mm: 300,  tf_mm: 19.0, tw_mm: 11.0, r_mm: 27,
    weight_kg_per_m: 117.0, area_cm2: 149.1,
    Ix_cm4: 25170, Iy_cm4: 8563,  Wx_cm3: 1678,  Wy_cm3: 571,   ix_cm: 12.99,iy_cm: 7.58,
  },
  {
    designation: 'HEB 320', profileType: 'HEB', standard: 'EN10365',
    h_mm: 320,  b_mm: 300,  tf_mm: 20.5, tw_mm: 11.5, r_mm: 27,
    weight_kg_per_m: 127.0, area_cm2: 161.3,
    Ix_cm4: 30820, Iy_cm4: 9239,  Wx_cm3: 1926,  Wy_cm3: 616,   ix_cm: 13.82,iy_cm: 7.57,
  },
  {
    designation: 'HEB 340', profileType: 'HEB', standard: 'EN10365',
    h_mm: 340,  b_mm: 300,  tf_mm: 21.5, tw_mm: 12.0, r_mm: 27,
    weight_kg_per_m: 134.0, area_cm2: 170.9,
    Ix_cm4: 36660, Iy_cm4: 9690,  Wx_cm3: 2156,  Wy_cm3: 646,   ix_cm: 14.65,iy_cm: 7.53,
  },
  {
    designation: 'HEB 360', profileType: 'HEB', standard: 'EN10365',
    h_mm: 360,  b_mm: 300,  tf_mm: 22.5, tw_mm: 12.5, r_mm: 27,
    weight_kg_per_m: 142.0, area_cm2: 180.6,
    Ix_cm4: 43190, Iy_cm4: 10140, Wx_cm3: 2400,  Wy_cm3: 676,   ix_cm: 15.46,iy_cm: 7.49,
  },
  {
    designation: 'HEB 400', profileType: 'HEB', standard: 'EN10365',
    h_mm: 400,  b_mm: 300,  tf_mm: 24.0, tw_mm: 13.5, r_mm: 27,
    weight_kg_per_m: 155.0, area_cm2: 197.8,
    Ix_cm4: 57680, Iy_cm4: 10820, Wx_cm3: 2884,  Wy_cm3: 721,   ix_cm: 17.08,iy_cm: 7.40,
  },
  {
    designation: 'HEB 450', profileType: 'HEB', standard: 'EN10365',
    h_mm: 450,  b_mm: 300,  tf_mm: 26.0, tw_mm: 14.0, r_mm: 27,
    weight_kg_per_m: 171.0, area_cm2: 218.0,
    Ix_cm4: 79890, Iy_cm4: 11720, Wx_cm3: 3551,  Wy_cm3: 781,   ix_cm: 19.13,iy_cm: 7.33,
  },
  {
    designation: 'HEB 500', profileType: 'HEB', standard: 'EN10365',
    h_mm: 500,  b_mm: 300,  tf_mm: 28.0, tw_mm: 14.5, r_mm: 27,
    weight_kg_per_m: 187.0, area_cm2: 238.6,
    Ix_cm4: 107200,Iy_cm4: 12620, Wx_cm3: 4287,  Wy_cm3: 841,   ix_cm: 21.21,iy_cm: 7.27,
  },
  {
    designation: 'HEB 550', profileType: 'HEB', standard: 'EN10365',
    h_mm: 550,  b_mm: 300,  tf_mm: 29.0, tw_mm: 15.0, r_mm: 27,
    weight_kg_per_m: 199.0, area_cm2: 254.1,
    Ix_cm4: 136700,Iy_cm4: 13080, Wx_cm3: 4971,  Wy_cm3: 872,   ix_cm: 23.20,iy_cm: 7.17,
  },
  {
    designation: 'HEB 600', profileType: 'HEB', standard: 'EN10365',
    h_mm: 600,  b_mm: 300,  tf_mm: 30.0, tw_mm: 15.5, r_mm: 27,
    weight_kg_per_m: 212.0, area_cm2: 270.0,
    Ix_cm4: 171000,Iy_cm4: 13530, Wx_cm3: 5701,  Wy_cm3: 902,   ix_cm: 25.17,iy_cm: 7.08,
  },
  {
    designation: 'HEB 650', profileType: 'HEB', standard: 'EN10365',
    h_mm: 650,  b_mm: 300,  tf_mm: 31.0, tw_mm: 16.0, r_mm: 27,
    weight_kg_per_m: 225.0, area_cm2: 286.3,
    Ix_cm4: 210600,Iy_cm4: 13980, Wx_cm3: 6480,  Wy_cm3: 932,   ix_cm: 27.13,iy_cm: 6.99,
  },
  {
    designation: 'HEB 700', profileType: 'HEB', standard: 'EN10365',
    h_mm: 700,  b_mm: 300,  tf_mm: 32.0, tw_mm: 17.0, r_mm: 27,
    weight_kg_per_m: 241.0, area_cm2: 306.4,
    Ix_cm4: 256900,Iy_cm4: 14440, Wx_cm3: 7340,  Wy_cm3: 963,   ix_cm: 28.96,iy_cm: 6.87,
  },
  {
    designation: 'HEB 800', profileType: 'HEB', standard: 'EN10365',
    h_mm: 800,  b_mm: 300,  tf_mm: 33.0, tw_mm: 17.5, r_mm: 30,
    weight_kg_per_m: 262.0, area_cm2: 334.2,
    Ix_cm4: 359100,Iy_cm4: 14900, Wx_cm3: 8977,  Wy_cm3: 993,   ix_cm: 32.78,iy_cm: 6.68,
  },
  {
    designation: 'HEB 900', profileType: 'HEB', standard: 'EN10365',
    h_mm: 900,  b_mm: 300,  tf_mm: 35.0, tw_mm: 18.5, r_mm: 30,
    weight_kg_per_m: 291.0, area_cm2: 371.3,
    Ix_cm4: 494100,Iy_cm4: 15820, Wx_cm3: 10980, Wy_cm3: 1053,  ix_cm: 36.48,iy_cm: 6.53,
  },
  {
    designation: 'HEB 1000', profileType: 'HEB', standard: 'EN10365',
    h_mm: 1000, b_mm: 300,  tf_mm: 36.0, tw_mm: 19.0, r_mm: 30,
    weight_kg_per_m: 314.0, area_cm2: 400.0,
    Ix_cm4: 644700,Iy_cm4: 16270, Wx_cm3: 12890, Wy_cm3: 1085,  ix_cm: 40.17,iy_cm: 6.38,
  },
];

// ── IPE Sections (EN 10365) ──────────────────────────────────────────────
export const IPE_SECTIONS: SectionProps[] = [
  {
    designation: 'IPE 80', profileType: 'IPE', standard: 'EN10365',
    h_mm: 80,   b_mm: 46,   tf_mm: 5.2,  tw_mm: 3.8,  r_mm: 5,
    weight_kg_per_m: 6.0,   area_cm2: 7.64,
    Ix_cm4: 80.1,  Iy_cm4: 8.49,  Wx_cm3: 20.0,  Wy_cm3: 3.69,  ix_cm: 3.24, iy_cm: 1.05,
  },
  {
    designation: 'IPE 100', profileType: 'IPE', standard: 'EN10365',
    h_mm: 100,  b_mm: 55,   tf_mm: 5.7,  tw_mm: 4.1,  r_mm: 7,
    weight_kg_per_m: 8.1,   area_cm2: 10.3,
    Ix_cm4: 171,   Iy_cm4: 15.9,  Wx_cm3: 34.2,  Wy_cm3: 5.79,  ix_cm: 4.07, iy_cm: 1.24,
  },
  {
    designation: 'IPE 120', profileType: 'IPE', standard: 'EN10365',
    h_mm: 120,  b_mm: 64,   tf_mm: 6.3,  tw_mm: 4.4,  r_mm: 7,
    weight_kg_per_m: 10.4,  area_cm2: 13.2,
    Ix_cm4: 318,   Iy_cm4: 27.7,  Wx_cm3: 53.0,  Wy_cm3: 8.65,  ix_cm: 4.90, iy_cm: 1.45,
  },
  {
    designation: 'IPE 140', profileType: 'IPE', standard: 'EN10365',
    h_mm: 140,  b_mm: 73,   tf_mm: 6.9,  tw_mm: 4.7,  r_mm: 7,
    weight_kg_per_m: 12.9,  area_cm2: 16.4,
    Ix_cm4: 541,   Iy_cm4: 44.9,  Wx_cm3: 77.3,  Wy_cm3: 12.3,  ix_cm: 5.74, iy_cm: 1.65,
  },
  {
    designation: 'IPE 160', profileType: 'IPE', standard: 'EN10365',
    h_mm: 160,  b_mm: 82,   tf_mm: 7.4,  tw_mm: 5.0,  r_mm: 9,
    weight_kg_per_m: 15.8,  area_cm2: 20.1,
    Ix_cm4: 869,   Iy_cm4: 68.3,  Wx_cm3: 109,   Wy_cm3: 16.7,  ix_cm: 6.58, iy_cm: 1.84,
  },
  {
    designation: 'IPE 180', profileType: 'IPE', standard: 'EN10365',
    h_mm: 180,  b_mm: 91,   tf_mm: 8.0,  tw_mm: 5.3,  r_mm: 9,
    weight_kg_per_m: 18.8,  area_cm2: 23.9,
    Ix_cm4: 1317,  Iy_cm4: 101,   Wx_cm3: 146,   Wy_cm3: 22.2,  ix_cm: 7.42, iy_cm: 2.05,
  },
  {
    designation: 'IPE 200', profileType: 'IPE', standard: 'EN10365',
    h_mm: 200,  b_mm: 100,  tf_mm: 8.5,  tw_mm: 5.6,  r_mm: 12,
    weight_kg_per_m: 22.4,  area_cm2: 28.5,
    Ix_cm4: 1943,  Iy_cm4: 142,   Wx_cm3: 194,   Wy_cm3: 28.5,  ix_cm: 8.26, iy_cm: 2.24,
  },
  {
    designation: 'IPE 220', profileType: 'IPE', standard: 'EN10365',
    h_mm: 220,  b_mm: 110,  tf_mm: 9.2,  tw_mm: 5.9,  r_mm: 12,
    weight_kg_per_m: 26.2,  area_cm2: 33.4,
    Ix_cm4: 2772,  Iy_cm4: 205,   Wx_cm3: 252,   Wy_cm3: 37.3,  ix_cm: 9.11, iy_cm: 2.48,
  },
  {
    designation: 'IPE 240', profileType: 'IPE', standard: 'EN10365',
    h_mm: 240,  b_mm: 120,  tf_mm: 9.8,  tw_mm: 6.2,  r_mm: 15,
    weight_kg_per_m: 30.7,  area_cm2: 39.1,
    Ix_cm4: 3892,  Iy_cm4: 284,   Wx_cm3: 324,   Wy_cm3: 47.3,  ix_cm: 9.97, iy_cm: 2.69,
  },
  {
    designation: 'IPE 270', profileType: 'IPE', standard: 'EN10365',
    h_mm: 270,  b_mm: 135,  tf_mm: 10.2, tw_mm: 6.6,  r_mm: 15,
    weight_kg_per_m: 36.1,  area_cm2: 45.9,
    Ix_cm4: 5790,  Iy_cm4: 420,   Wx_cm3: 429,   Wy_cm3: 62.2,  ix_cm: 11.23,iy_cm: 3.02,
  },
  {
    designation: 'IPE 300', profileType: 'IPE', standard: 'EN10365',
    h_mm: 300,  b_mm: 150,  tf_mm: 10.7, tw_mm: 7.1,  r_mm: 15,
    weight_kg_per_m: 42.2,  area_cm2: 53.8,
    Ix_cm4: 8356,  Iy_cm4: 604,   Wx_cm3: 557,   Wy_cm3: 80.5,  ix_cm: 12.46,iy_cm: 3.35,
  },
  {
    designation: 'IPE 330', profileType: 'IPE', standard: 'EN10365',
    h_mm: 330,  b_mm: 160,  tf_mm: 11.5, tw_mm: 7.5,  r_mm: 18,
    weight_kg_per_m: 49.1,  area_cm2: 62.6,
    Ix_cm4: 11770, Iy_cm4: 788,   Wx_cm3: 713,   Wy_cm3: 98.5,  ix_cm: 13.71,iy_cm: 3.55,
  },
  {
    designation: 'IPE 360', profileType: 'IPE', standard: 'EN10365',
    h_mm: 360,  b_mm: 170,  tf_mm: 12.7, tw_mm: 8.0,  r_mm: 18,
    weight_kg_per_m: 57.1,  area_cm2: 72.7,
    Ix_cm4: 16270, Iy_cm4: 1043,  Wx_cm3: 904,   Wy_cm3: 123,   ix_cm: 14.95,iy_cm: 3.79,
  },
  {
    designation: 'IPE 400', profileType: 'IPE', standard: 'EN10365',
    h_mm: 400,  b_mm: 180,  tf_mm: 13.5, tw_mm: 8.6,  r_mm: 21,
    weight_kg_per_m: 66.3,  area_cm2: 84.5,
    Ix_cm4: 23130, Iy_cm4: 1318,  Wx_cm3: 1156,  Wy_cm3: 146,   ix_cm: 16.53,iy_cm: 3.95,
  },
  {
    designation: 'IPE 450', profileType: 'IPE', standard: 'EN10365',
    h_mm: 450,  b_mm: 190,  tf_mm: 14.6, tw_mm: 9.4,  r_mm: 21,
    weight_kg_per_m: 77.6,  area_cm2: 98.8,
    Ix_cm4: 33740, Iy_cm4: 1676,  Wx_cm3: 1500,  Wy_cm3: 176,   ix_cm: 18.48,iy_cm: 4.12,
  },
  {
    designation: 'IPE 500', profileType: 'IPE', standard: 'EN10365',
    h_mm: 500,  b_mm: 200,  tf_mm: 16.0, tw_mm: 10.2, r_mm: 21,
    weight_kg_per_m: 90.7,  area_cm2: 115.5,
    Ix_cm4: 48200, Iy_cm4: 2142,  Wx_cm3: 1928,  Wy_cm3: 214,   ix_cm: 20.43,iy_cm: 4.31,
  },
  {
    designation: 'IPE 550', profileType: 'IPE', standard: 'EN10365',
    h_mm: 550,  b_mm: 210,  tf_mm: 17.2, tw_mm: 11.1, r_mm: 24,
    weight_kg_per_m: 106.0, area_cm2: 134.4,
    Ix_cm4: 67120, Iy_cm4: 2668,  Wx_cm3: 2441,  Wy_cm3: 254,   ix_cm: 22.35,iy_cm: 4.45,
  },
  {
    designation: 'IPE 600', profileType: 'IPE', standard: 'EN10365',
    h_mm: 600,  b_mm: 220,  tf_mm: 19.0, tw_mm: 12.0, r_mm: 24,
    weight_kg_per_m: 122.0, area_cm2: 156.0,
    Ix_cm4: 92080, Iy_cm4: 3387,  Wx_cm3: 3069,  Wy_cm3: 308,   ix_cm: 24.30,iy_cm: 4.66,
  },
];

// ── UPN Sections (EN 10365) ──────────────────────────────────────────────
export const UPN_SECTIONS: SectionProps[] = [
  {
    designation: 'UPN 80', profileType: 'UPN', standard: 'EN10365',
    h_mm: 80,   b_mm: 45,   tf_mm: 8.0,  tw_mm: 6.0,  r_mm: 8,
    weight_kg_per_m: 8.64,  area_cm2: 11.0,
    Ix_cm4: 106,   Iy_cm4: 19.4,  Wx_cm3: 26.5,  Wy_cm3: 6.36,  ix_cm: 3.10, iy_cm: 1.33,
  },
  {
    designation: 'UPN 100', profileType: 'UPN', standard: 'EN10365',
    h_mm: 100,  b_mm: 50,   tf_mm: 8.5,  tw_mm: 6.0,  r_mm: 8,
    weight_kg_per_m: 10.6,  area_cm2: 13.5,
    Ix_cm4: 206,   Iy_cm4: 29.3,  Wx_cm3: 41.2,  Wy_cm3: 8.49,  ix_cm: 3.91, iy_cm: 1.47,
  },
  {
    designation: 'UPN 120', profileType: 'UPN', standard: 'EN10365',
    h_mm: 120,  b_mm: 55,   tf_mm: 9.0,  tw_mm: 7.0,  r_mm: 9,
    weight_kg_per_m: 13.4,  area_cm2: 17.0,
    Ix_cm4: 364,   Iy_cm4: 43.2,  Wx_cm3: 60.7,  Wy_cm3: 11.1,  ix_cm: 4.63, iy_cm: 1.59,
  },
  {
    designation: 'UPN 140', profileType: 'UPN', standard: 'EN10365',
    h_mm: 140,  b_mm: 60,   tf_mm: 10.0, tw_mm: 7.0,  r_mm: 10,
    weight_kg_per_m: 16.0,  area_cm2: 20.4,
    Ix_cm4: 605,   Iy_cm4: 62.7,  Wx_cm3: 86.4,  Wy_cm3: 14.8,  ix_cm: 5.45, iy_cm: 1.75,
  },
  {
    designation: 'UPN 160', profileType: 'UPN', standard: 'EN10365',
    h_mm: 160,  b_mm: 65,   tf_mm: 10.5, tw_mm: 7.5,  r_mm: 10,
    weight_kg_per_m: 18.8,  area_cm2: 24.0,
    Ix_cm4: 925,   Iy_cm4: 85.3,  Wx_cm3: 116,   Wy_cm3: 18.3,  ix_cm: 6.21, iy_cm: 1.89,
  },
  {
    designation: 'UPN 180', profileType: 'UPN', standard: 'EN10365',
    h_mm: 180,  b_mm: 70,   tf_mm: 11.0, tw_mm: 8.0,  r_mm: 11,
    weight_kg_per_m: 22.0,  area_cm2: 28.0,
    Ix_cm4: 1350,  Iy_cm4: 114,   Wx_cm3: 150,   Wy_cm3: 22.4,  ix_cm: 6.95, iy_cm: 2.02,
  },
  {
    designation: 'UPN 200', profileType: 'UPN', standard: 'EN10365',
    h_mm: 200,  b_mm: 75,   tf_mm: 11.5, tw_mm: 8.5,  r_mm: 11,
    weight_kg_per_m: 25.3,  area_cm2: 32.2,
    Ix_cm4: 1910,  Iy_cm4: 148,   Wx_cm3: 191,   Wy_cm3: 27.0,  ix_cm: 7.70, iy_cm: 2.14,
  },
  {
    designation: 'UPN 220', profileType: 'UPN', standard: 'EN10365',
    h_mm: 220,  b_mm: 80,   tf_mm: 12.5, tw_mm: 9.0,  r_mm: 12,
    weight_kg_per_m: 29.4,  area_cm2: 37.4,
    Ix_cm4: 2690,  Iy_cm4: 197,   Wx_cm3: 245,   Wy_cm3: 33.6,  ix_cm: 8.48, iy_cm: 2.30,
  },
  {
    designation: 'UPN 240', profileType: 'UPN', standard: 'EN10365',
    h_mm: 240,  b_mm: 85,   tf_mm: 13.0, tw_mm: 9.5,  r_mm: 13,
    weight_kg_per_m: 33.2,  area_cm2: 42.3,
    Ix_cm4: 3600,  Iy_cm4: 248,   Wx_cm3: 300,   Wy_cm3: 39.6,  ix_cm: 9.22, iy_cm: 2.42,
  },
  {
    designation: 'UPN 260', profileType: 'UPN', standard: 'EN10365',
    h_mm: 260,  b_mm: 90,   tf_mm: 14.0, tw_mm: 10.0, r_mm: 13,
    weight_kg_per_m: 37.9,  area_cm2: 48.3,
    Ix_cm4: 4820,  Iy_cm4: 317,   Wx_cm3: 371,   Wy_cm3: 47.7,  ix_cm: 9.99, iy_cm: 2.56,
  },
  {
    designation: 'UPN 280', profileType: 'UPN', standard: 'EN10365',
    h_mm: 280,  b_mm: 95,   tf_mm: 15.0, tw_mm: 10.0, r_mm: 13,
    weight_kg_per_m: 41.8,  area_cm2: 53.3,
    Ix_cm4: 6280,  Iy_cm4: 399,   Wx_cm3: 448,   Wy_cm3: 57.2,  ix_cm: 10.86,iy_cm: 2.74,
  },
  {
    designation: 'UPN 300', profileType: 'UPN', standard: 'EN10365',
    h_mm: 300,  b_mm: 100,  tf_mm: 16.0, tw_mm: 10.0, r_mm: 14,
    weight_kg_per_m: 46.2,  area_cm2: 58.8,
    Ix_cm4: 8030,  Iy_cm4: 495,   Wx_cm3: 535,   Wy_cm3: 67.8,  ix_cm: 11.69,iy_cm: 2.90,
  },
  {
    designation: 'UPN 320', profileType: 'UPN', standard: 'EN10365',
    h_mm: 320,  b_mm: 100,  tf_mm: 17.5, tw_mm: 10.0, r_mm: 15,
    weight_kg_per_m: 59.5,  area_cm2: 75.8,
    Ix_cm4: 10870, Iy_cm4: 597,   Wx_cm3: 679,   Wy_cm3: 80.6,  ix_cm: 11.98,iy_cm: 2.81,
  },
  {
    designation: 'UPN 350', profileType: 'UPN', standard: 'EN10365',
    h_mm: 350,  b_mm: 100,  tf_mm: 16.0, tw_mm: 14.0, r_mm: 16,
    weight_kg_per_m: 60.6,  area_cm2: 77.3,
    Ix_cm4: 12840, Iy_cm4: 570,   Wx_cm3: 734,   Wy_cm3: 78.3,  ix_cm: 12.89,iy_cm: 2.72,
  },
  {
    designation: 'UPN 380', profileType: 'UPN', standard: 'EN10365',
    h_mm: 380,  b_mm: 102,  tf_mm: 16.0, tw_mm: 13.5, r_mm: 16,
    weight_kg_per_m: 63.1,  area_cm2: 80.4,
    Ix_cm4: 15760, Iy_cm4: 615,   Wx_cm3: 829,   Wy_cm3: 83.4,  ix_cm: 14.00,iy_cm: 2.77,
  },
  {
    designation: 'UPN 400', profileType: 'UPN', standard: 'EN10365',
    h_mm: 400,  b_mm: 110,  tf_mm: 18.0, tw_mm: 14.0, r_mm: 18,
    weight_kg_per_m: 71.8,  area_cm2: 91.5,
    Ix_cm4: 20350, Iy_cm4: 846,   Wx_cm3: 1017,  Wy_cm3: 102,   ix_cm: 14.92,iy_cm: 3.04,
  },
];

// ── Equal Angle Sections (DIN 1028 / EN 10056) ───────────────────────────
// For angles: h_mm = b_mm = leg length, tf_mm = tw_mm = leg thickness
// Iy_cm4 = Iz (minor), ix_cm = iy_cm for equal legs (symmetry)
export const ANGLE_EQUAL_SECTIONS: SectionProps[] = [
  {
    designation: 'L 40x40x4', profileType: 'EQUAL_ANGLE', standard: 'EN10056',
    h_mm: 40,   b_mm: 40,   tf_mm: 4.0,  tw_mm: 4.0,  r_mm: 4,
    weight_kg_per_m: 2.42,  area_cm2: 3.08,
    Ix_cm4: 1.77,  Iy_cm4: 1.77,  Wx_cm3: 0.635, Wy_cm3: 0.635, ix_cm: 0.757,iy_cm: 0.757,
  },
  {
    designation: 'L 50x50x5', profileType: 'EQUAL_ANGLE', standard: 'EN10056',
    h_mm: 50,   b_mm: 50,   tf_mm: 5.0,  tw_mm: 5.0,  r_mm: 5,
    weight_kg_per_m: 3.77,  area_cm2: 4.80,
    Ix_cm4: 4.26,  Iy_cm4: 4.26,  Wx_cm3: 1.21,  Wy_cm3: 1.21,  ix_cm: 0.942,iy_cm: 0.942,
  },
  {
    designation: 'L 60x60x6', profileType: 'EQUAL_ANGLE', standard: 'EN10056',
    h_mm: 60,   b_mm: 60,   tf_mm: 6.0,  tw_mm: 6.0,  r_mm: 6,
    weight_kg_per_m: 5.42,  area_cm2: 6.91,
    Ix_cm4: 8.69,  Iy_cm4: 8.69,  Wx_cm3: 2.08,  Wy_cm3: 2.08,  ix_cm: 1.16, iy_cm: 1.16,
  },
  {
    designation: 'L 70x70x7', profileType: 'EQUAL_ANGLE', standard: 'EN10056',
    h_mm: 70,   b_mm: 70,   tf_mm: 7.0,  tw_mm: 7.0,  r_mm: 7,
    weight_kg_per_m: 7.38,  area_cm2: 9.40,
    Ix_cm4: 17.4,  Iy_cm4: 17.4,  Wx_cm3: 3.57,  Wy_cm3: 3.57,  ix_cm: 1.36, iy_cm: 1.36,
  },
  {
    designation: 'L 80x80x8', profileType: 'EQUAL_ANGLE', standard: 'EN10056',
    h_mm: 80,   b_mm: 80,   tf_mm: 8.0,  tw_mm: 8.0,  r_mm: 8,
    weight_kg_per_m: 9.63,  area_cm2: 12.3,
    Ix_cm4: 29.2,  Iy_cm4: 29.2,  Wx_cm3: 5.27,  Wy_cm3: 5.27,  ix_cm: 1.55, iy_cm: 1.55,
  },
  {
    designation: 'L 90x90x9', profileType: 'EQUAL_ANGLE', standard: 'EN10056',
    h_mm: 90,   b_mm: 90,   tf_mm: 9.0,  tw_mm: 9.0,  r_mm: 9,
    weight_kg_per_m: 12.2,  area_cm2: 15.5,
    Ix_cm4: 46.7,  Iy_cm4: 46.7,  Wx_cm3: 7.42,  Wy_cm3: 7.42,  ix_cm: 1.74, iy_cm: 1.74,
  },
  {
    designation: 'L 100x100x10', profileType: 'EQUAL_ANGLE', standard: 'EN10056',
    h_mm: 100,  b_mm: 100,  tf_mm: 10.0, tw_mm: 10.0, r_mm: 10,
    weight_kg_per_m: 15.0,  area_cm2: 19.2,
    Ix_cm4: 70.5,  Iy_cm4: 70.5,  Wx_cm3: 10.1,  Wy_cm3: 10.1,  ix_cm: 1.92, iy_cm: 1.92,
  },
  {
    designation: 'L 120x120x12', profileType: 'EQUAL_ANGLE', standard: 'EN10056',
    h_mm: 120,  b_mm: 120,  tf_mm: 12.0, tw_mm: 12.0, r_mm: 11,
    weight_kg_per_m: 21.6,  area_cm2: 27.5,
    Ix_cm4: 144,   Iy_cm4: 144,   Wx_cm3: 17.3,  Wy_cm3: 17.3,  ix_cm: 2.29, iy_cm: 2.29,
  },
  {
    designation: 'L 150x150x15', profileType: 'EQUAL_ANGLE', standard: 'EN10056',
    h_mm: 150,  b_mm: 150,  tf_mm: 15.0, tw_mm: 15.0, r_mm: 13,
    weight_kg_per_m: 33.8,  area_cm2: 43.0,
    Ix_cm4: 346,   Iy_cm4: 346,   Wx_cm3: 33.2,  Wy_cm3: 33.2,  ix_cm: 2.84, iy_cm: 2.84,
  },
  {
    designation: 'L 200x200x20', profileType: 'EQUAL_ANGLE', standard: 'EN10056',
    h_mm: 200,  b_mm: 200,  tf_mm: 20.0, tw_mm: 20.0, r_mm: 18,
    weight_kg_per_m: 60.0,  area_cm2: 76.4,
    Ix_cm4: 1094,  Iy_cm4: 1094,  Wx_cm3: 78.6,  Wy_cm3: 78.6,  ix_cm: 3.79, iy_cm: 3.79,
  },
];

// ── All sections combined ─────────────────────────────────────────────────
export const ALL_SECTIONS: SectionProps[] = [
  ...HEA_SECTIONS,
  ...HEB_SECTIONS,
  ...IPE_SECTIONS,
  ...UPN_SECTIONS,
  ...ANGLE_EQUAL_SECTIONS,
];

/**
 * Look up a section by profileType + designation.
 * Returns undefined if not found.
 *
 * @example
 *   lookupSection('HEA', 'HEA 200')  // returns HEA 200 props
 *   lookupSection('IPE', 'IPE 300')  // returns IPE 300 props
 */
export function lookupSection(
  profileType: string,
  designation: string,
): SectionProps | undefined {
  const type = profileType.toUpperCase().trim();
  const desig = designation.toUpperCase().trim();
  return ALL_SECTIONS.find(
    (s) =>
      s.profileType.toUpperCase() === type &&
      s.designation.toUpperCase() === desig,
  );
}
