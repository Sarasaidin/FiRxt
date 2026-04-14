import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Phase 1 data...");

  // ─── Admin ───────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@firxt.com" },
    update: {},
    create: {
      name: "FiRxt Admin",
      email: "admin@firxt.com",
      passwordHash: adminHash,
      role: "ADMIN",
    },
  });
  console.log("Admin:", admin.email);

  // ─── Categories ──────────────────────────────────────────────────────────
  const cats = await Promise.all([
    prisma.category.upsert({
      where: { slug: "vitamins-supplements" },
      update: {},
      create: { name: "Vitamins & Supplements", slug: "vitamins-supplements" },
    }),
    prisma.category.upsert({
      where: { slug: "cold-flu" },
      update: {},
      create: { name: "Cold & Flu", slug: "cold-flu" },
    }),
    prisma.category.upsert({
      where: { slug: "pain-relief" },
      update: {},
      create: { name: "Pain Relief", slug: "pain-relief" },
    }),
    prisma.category.upsert({
      where: { slug: "skincare" },
      update: {},
      create: { name: "Skincare & Personal Care", slug: "skincare" },
    }),
    prisma.category.upsert({
      where: { slug: "medical-devices" },
      update: {},
      create: { name: "Medical Devices", slug: "medical-devices" },
    }),
    prisma.category.upsert({
      where: { slug: "mother-baby" },
      update: {},
      create: { name: "Mother & Baby", slug: "mother-baby" },
    }),
    prisma.category.upsert({
      where: { slug: "sports-nutrition" },
      update: {},
      create: { name: "Sports Nutrition", slug: "sports-nutrition" },
    }),
    prisma.category.upsert({
      where: { slug: "digestive-health" },
      update: {},
      create: { name: "Digestive Health", slug: "digestive-health" },
    }),
    prisma.category.upsert({
      where: { slug: "general-consultation" },
      update: {},
      create: { name: "General Consultation", slug: "general-consultation" },
    }),
    prisma.category.upsert({
      where: { slug: "diagnostic-tests" },
      update: {},
      create: { name: "Diagnostic Tests", slug: "diagnostic-tests" },
    }),
    prisma.category.upsert({
      where: { slug: "specialist-care" },
      update: {},
      create: { name: "Specialist Care", slug: "specialist-care" },
    }),
  ]);

  const [
    catVit,
    catCold,
    catPain,
    catSkin,
    catDevice,
    catMomBaby,
    catSports,
    catDigest,
    catConsult,
    catDiag,
    catSpec,
  ] = cats;

  console.log("Categories done");

  // ─── Partner Users ───────────────────────────────────────────────────────
  const partnerHash = await bcrypt.hash("partner123", 12);

  const partnerEmails = [
    "guardian.klcc@firxt.com",
    "caring.bangsar@firxt.com",
    "watsons.midvalley@firxt.com",
    "aa.pharmacy@firxt.com",
    "kpj.kl@firxt.com",
    "pantai.hospital@firxt.com",
    "drtan.clinic@firxt.com",
    "poliklinik.wangsamaju@firxt.com",
  ];

  const partnerUsers = await Promise.all(
    partnerEmails.map((email, i) =>
      prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          name: `Partner Owner ${i + 1}`,
          email,
          passwordHash: partnerHash,
          role: "PARTNER",
        },
      })
    )
  );

  console.log("Partner users done");

  // ─── Partners (Phase 1 only: Pharmacy + Clinic) ─────────────────────────
  const partnersData = [
    // ── PHARMACIES ──
    {
      userId: partnerUsers[0].id,
      slug: "guardian-pharmacy-klcc",
      name: "Guardian Pharmacy KLCC",
      type: "PHARMACY" as const,
      status: "APPROVED" as const,
      description:
        "Guardian Pharmacy at Suria KLCC offering a wide range of health products, beauty essentials, and pharmacist consultation.",
      addressLine1: "Lot 241, Level 2, Suria KLCC",
      addressLine2: "Jalan Ampang",
      city: "Kuala Lumpur",
      state: "Federal Territory of Kuala Lumpur",
      postcode: "50088",
      latitude: 3.1579,
      longitude: 101.7116,
      phone: "+60321637123",
      email: "guardian.klcc@example.com",
      website: "https://www.guardian.com.my",
      tags: ["pharmacy", "beauty", "health", "skincare", "vitamins"],
      isVerified: true,
      approvedAt: new Date("2025-01-10"),
    },
    {
      userId: partnerUsers[1].id,
      slug: "caring-pharmacy-bangsar",
      name: "Caring Pharmacy Bangsar",
      type: "PHARMACY" as const,
      status: "APPROVED" as const,
      description:
        "Caring Pharmacy in Bangsar offering prescription medicines, OTC products, and healthcare advisory services.",
      addressLine1: "No. 7, Jalan Telawi 3",
      addressLine2: "Bangsar Baru",
      city: "Kuala Lumpur",
      state: "Federal Territory of Kuala Lumpur",
      postcode: "59100",
      latitude: 3.1296,
      longitude: 101.6703,
      phone: "+60322822888",
      email: "caring.bangsar@example.com",
      website: "https://www.caringpharmacy.com",
      tags: ["pharmacy", "prescription", "OTC", "Bangsar"],
      isVerified: true,
      approvedAt: new Date("2025-01-15"),
    },
    {
      userId: partnerUsers[2].id,
      slug: "watsons-mid-valley",
      name: "Watsons Mid Valley Megamall",
      type: "PHARMACY" as const,
      status: "APPROVED" as const,
      description:
        "Watsons at Mid Valley Megamall with skincare, wellness, vitamins, and personal care products.",
      addressLine1: "Lot G-053, Ground Floor, Mid Valley Megamall",
      addressLine2: "Lingkaran Syed Putra",
      city: "Kuala Lumpur",
      state: "Federal Territory of Kuala Lumpur",
      postcode: "59200",
      latitude: 3.1176,
      longitude: 101.6766,
      phone: "+60322822991",
      email: "watsons.midvalley@example.com",
      website: "https://www.watsons.com.my",
      tags: ["pharmacy", "beauty", "wellness", "mid valley"],
      isVerified: true,
      approvedAt: new Date("2025-01-20"),
    },
    {
      userId: partnerUsers[3].id,
      slug: "aa-pharmacy-chow-kit",
      name: "AA Pharmacy Chow Kit",
      type: "PHARMACY" as const,
      status: "APPROVED" as const,
      description:
        "AA Pharmacy serving the Chow Kit community with affordable medicines, generics, and pharmacist support.",
      addressLine1: "No. 38, Jalan Raja Laut",
      city: "Kuala Lumpur",
      state: "Federal Territory of Kuala Lumpur",
      postcode: "50350",
      latitude: 3.1666,
      longitude: 101.6964,
      phone: "+60326988812",
      email: "aa.pharmacy@example.com",
      tags: ["pharmacy", "affordable", "generic", "Chow Kit"],
      isVerified: true,
      approvedAt: new Date("2025-02-01"),
    },

    // ── CLINICS ──
    {
      userId: partnerUsers[4].id,
      slug: "kpj-kuala-lumpur-specialist",
      name: "KPJ Kuala Lumpur Specialist Hospital",
      type: "CLINIC" as const,
      status: "APPROVED" as const,
      description:
        "KPJ Kuala Lumpur Specialist Hospital provides specialist healthcare services including cardiology, oncology, and orthopaedics.",
      addressLine1: "No. 242A, Jalan Ampang",
      city: "Kuala Lumpur",
      state: "Federal Territory of Kuala Lumpur",
      postcode: "50450",
      latitude: 3.157,
      longitude: 101.722,
      phone: "+60342556080",
      email: "kpj.kl@example.com",
      website: "https://www.kpjkl.com.my",
      tags: ["specialist", "hospital", "cardiology", "oncology", "Ampang"],
      isVerified: true,
      approvedAt: new Date("2025-01-05"),
    },
    {
      userId: partnerUsers[5].id,
      slug: "pantai-hospital-kuala-lumpur",
      name: "Pantai Hospital Kuala Lumpur",
      type: "CLINIC" as const,
      status: "APPROVED" as const,
      description:
        "Pantai Hospital Kuala Lumpur provides specialist healthcare with emergency and trauma services.",
      addressLine1: "No. 8, Jalan Bukit Pantai",
      city: "Kuala Lumpur",
      state: "Federal Territory of Kuala Lumpur",
      postcode: "59100",
      latitude: 3.126,
      longitude: 101.6764,
      phone: "+60322963333",
      email: "pantai.kl@example.com",
      website: "https://www.pantai.com.my",
      tags: ["specialist", "hospital", "emergency", "Bangsar"],
      isVerified: true,
      approvedAt: new Date("2025-01-08"),
    },
    {
      userId: partnerUsers[6].id,
      slug: "dr-tan-family-clinic-damansara",
      name: "Dr. Tan's Family Clinic Damansara",
      type: "CLINIC" as const,
      status: "APPROVED" as const,
      description:
        "Friendly neighbourhood GP clinic in Damansara Heights offering primary care for the whole family.",
      addressLine1: "No. 25, Jalan Medan Setia 1",
      addressLine2: "Plaza Damansara",
      city: "Kuala Lumpur",
      state: "Federal Territory of Kuala Lumpur",
      postcode: "50490",
      latitude: 3.1407,
      longitude: 101.6276,
      phone: "+60320948877",
      email: "drtan.clinic@example.com",
      tags: ["GP", "family medicine", "Damansara", "walk-in"],
      isVerified: true,
      approvedAt: new Date("2025-02-10"),
    },
    {
      userId: partnerUsers[7].id,
      slug: "poliklinik-wangsa-maju",
      name: "Poliklinik Wangsa Maju",
      type: "CLINIC" as const,
      status: "APPROVED" as const,
      description:
        "Community health clinic providing affordable primary care, child vaccinations, and chronic disease management.",
      addressLine1: "No. 10, Jalan 2/27A, Seksyen 2",
      addressLine2: "Wangsa Maju",
      city: "Kuala Lumpur",
      state: "Federal Territory of Kuala Lumpur",
      postcode: "53300",
      latitude: 3.2066,
      longitude: 101.7333,
      phone: "+60341427788",
      email: "poliklinik.wm@example.com",
      tags: ["GP", "community clinic", "vaccination", "Wangsa Maju"],
      isVerified: true,
      approvedAt: new Date("2025-02-15"),
    },
  ];

  const partners = await Promise.all(
    partnersData.map((p) =>
      prisma.partner.upsert({
        where: { slug: p.slug },
        update: {},
        create: { ...p, country: "MY" },
      })
    )
  );

  console.log("Partners done:", partners.map((p) => p.name).join(", "));

  const [
    guardianKLCC,
    caringBangsar,
    watsons,
    aaPharmacy,
    kpjKL,
    pantai,
    drTan,
    poliklinik,
  ] = partners;

  // ─── Products ────────────────────────────────────────────────────────────
  const productsData = [
    // Guardian KLCC
    {
      partnerId: guardianKLCC.id,
      categoryId: catVit.id,
      name: "Blackmores Vitamin C 1000mg 60 Tablets",
      slug: "blackmores-vitamin-c-1000mg",
      description:
        "High-strength Vitamin C for antioxidant support and immune defense.",
      price: 3290,
      comparePrice: 3890,
      stock: 150,
      brand: "Blackmores",
      tags: ["vitamin C", "immune", "antioxidant"],
      isFeatured: true,
    },
    {
      partnerId: guardianKLCC.id,
      categoryId: catVit.id,
      name: "Shaklee Vita-E 400IU 90 Softgels",
      slug: "shaklee-vita-e-400iu",
      description:
        "Natural Vitamin E softgels for antioxidant support and cell protection.",
      price: 8990,
      comparePrice: 9590,
      stock: 60,
      brand: "Shaklee",
      tags: ["vitamin E", "antioxidant", "softgel"],
      isFeatured: false,
    },
    {
      partnerId: guardianKLCC.id,
      categoryId: catSkin.id,
      name: "Cetaphil Moisturising Cream 250g",
      slug: "cetaphil-moisturising-cream-250g",
      description:
        "Moisturising cream for dry, sensitive skin. Fragrance-free and dermatologist-tested.",
      price: 3490,
      comparePrice: 3990,
      stock: 200,
      brand: "Cetaphil",
      tags: ["moisturiser", "sensitive skin", "fragrance-free"],
      isFeatured: true,
    },
    {
      partnerId: guardianKLCC.id,
      categoryId: catPain.id,
      name: "Panadol Extra 500mg/65mg 20 Tablets",
      slug: "panadol-extra-500mg",
      description:
        "Fast and effective relief from headaches, fever, and body aches.",
      price: 680,
      comparePrice: 780,
      stock: 300,
      brand: "Panadol",
      tags: ["paracetamol", "headache", "fever", "pain"],
      isFeatured: false,
    },
    {
      partnerId: guardianKLCC.id,
      categoryId: catDevice.id,
      name: "Omron HEM-7156T Automatic Blood Pressure Monitor",
      slug: "omron-hem-7156t-bp-monitor",
      description:
        "Automatic upper-arm blood pressure monitor with Bluetooth connectivity.",
      price: 19900,
      comparePrice: 24900,
      stock: 30,
      brand: "Omron",
      tags: ["blood pressure", "monitor", "Bluetooth", "Omron"],
      isFeatured: true,
    },
    {
      partnerId: guardianKLCC.id,
      categoryId: catSports.id,
      name: "Optimum Nutrition Gold Standard 100% Whey 2lb (Chocolate)",
      slug: "on-gold-standard-whey-2lb-choc",
      description:
        "Whey protein for post-workout recovery with 24g protein per serving.",
      price: 18900,
      comparePrice: 21900,
      stock: 45,
      brand: "Optimum Nutrition",
      tags: ["protein", "whey", "gym", "recovery"],
      isFeatured: false,
    },

    // Caring Pharmacy Bangsar
    {
      partnerId: caringBangsar.id,
      categoryId: catCold.id,
      name: "Clarinase Repetabs 12-Hour Relief 10 Tablets",
      slug: "clarinase-repetabs-10s",
      description:
        "12-hour relief from allergic rhinitis symptoms including sneezing and nasal congestion.",
      price: 1890,
      comparePrice: 2190,
      stock: 120,
      brand: "MSD",
      tags: ["allergy", "rhinitis", "non-drowsy"],
      isFeatured: true,
    },
    {
      partnerId: caringBangsar.id,
      categoryId: catDigest.id,
      name: "Gaviscon Advance Aniseed 500ml",
      slug: "gaviscon-advance-aniseed-500ml",
      description:
        "Relief for heartburn and acid reflux with a protective layer action.",
      price: 3190,
      comparePrice: 3490,
      stock: 80,
      brand: "Gaviscon",
      tags: ["heartburn", "acid reflux", "antacid"],
      isFeatured: false,
    },
    {
      partnerId: caringBangsar.id,
      categoryId: catVit.id,
      name: "Neurobion Forte B1+B6+B12 60 Tablets",
      slug: "neurobion-forte-b-complex",
      description:
        "B vitamin blend to support peripheral nerve health and energy metabolism.",
      price: 2490,
      comparePrice: 2890,
      stock: 200,
      brand: "Merck",
      tags: ["vitamin B", "nerve health", "energy"],
      isFeatured: true,
    },
    {
      partnerId: caringBangsar.id,
      categoryId: catSkin.id,
      name: "Bepanthen Nappy Care Ointment 100g",
      slug: "bepanthen-nappy-care-100g",
      description:
        "Protective ointment for delicate baby skin and nappy rash relief.",
      price: 2290,
      comparePrice: 2590,
      stock: 95,
      brand: "Bepanthen",
      tags: ["baby", "nappy rash", "gentle"],
      isFeatured: false,
    },
    {
      partnerId: caringBangsar.id,
      categoryId: catDevice.id,
      name: "Braun ThermoScan 7 IRT6520 Ear Thermometer",
      slug: "braun-thermoscan7-ear-thermometer",
      description:
        "Precise ear thermometer with Age Precision technology.",
      price: 24900,
      comparePrice: 28500,
      stock: 25,
      brand: "Braun",
      tags: ["thermometer", "ear", "baby", "temperature"],
      isFeatured: true,
    },

    // Watsons Mid Valley
    {
      partnerId: watsons.id,
      categoryId: catSkin.id,
      name: "CeraVe Hydrating Facial Cleanser 236ml",
      slug: "cerave-hydrating-facial-cleanser-236ml",
      description:
        "Hydrating cleanser with ceramides and hyaluronic acid for normal to dry skin.",
      price: 3890,
      comparePrice: 4290,
      stock: 180,
      brand: "CeraVe",
      tags: ["cleanser", "ceramide", "hydrating", "sensitive"],
      isFeatured: true,
    },
    {
      partnerId: watsons.id,
      categoryId: catSkin.id,
      name: "La Roche-Posay Anthelios SPF50+ Fluid 50ml",
      slug: "la-roche-posay-anthelios-spf50",
      description:
        "Ultra-light sunscreen fluid with very high UVA/UVB protection.",
      price: 8590,
      comparePrice: 9290,
      stock: 100,
      brand: "La Roche-Posay",
      tags: ["sunscreen", "SPF50", "UV protection"],
      isFeatured: false,
    },
    {
      partnerId: watsons.id,
      categoryId: catVit.id,
      name: "Vitagen Collagen + Vitamin C 10 sachets",
      slug: "vitagen-collagen-vitamin-c-sachets",
      description:
        "Marine collagen peptides with Vitamin C for skin and joint support.",
      price: 7990,
      comparePrice: 8990,
      stock: 120,
      brand: "Vitagen",
      tags: ["collagen", "marine", "skin"],
      isFeatured: true,
    },
    {
      partnerId: watsons.id,
      categoryId: catMomBaby.id,
      name: "Similac Gain Plus Stage 3 (1-3 years) 1.7kg",
      slug: "similac-gain-plus-stage3-1-7kg",
      description:
        "Growing-up milk formula for children aged 1 to 3 years.",
      price: 8990,
      comparePrice: 9890,
      stock: 50,
      brand: "Abbott",
      tags: ["formula milk", "toddler", "DHA"],
      isFeatured: false,
    },

    // AA Pharmacy Chow Kit
    {
      partnerId: aaPharmacy.id,
      categoryId: catPain.id,
      name: "Arcoxia 90mg Tablets (Pack of 14)",
      slug: "arcoxia-90mg-14s",
      description:
        "COX-2 selective NSAID for arthritis and gout pain relief. Prescription required.",
      price: 4800,
      comparePrice: 5500,
      stock: 60,
      brand: "MSD",
      requiresPrescription: true,
      tags: ["NSAID", "arthritis", "gout", "pain"],
      isFeatured: false,
    },
    {
      partnerId: aaPharmacy.id,
      categoryId: catDigest.id,
      name: "Nexium 20mg Esomeprazole 14 Capsules",
      slug: "nexium-20mg-14s",
      description:
        "PPI used for GERD, gastric ulcers, and acid-related conditions. Prescription required.",
      price: 3600,
      comparePrice: 4200,
      stock: 80,
      brand: "AstraZeneca",
      requiresPrescription: true,
      tags: ["PPI", "GERD", "ulcer", "stomach"],
      isFeatured: false,
    },
    {
      partnerId: aaPharmacy.id,
      categoryId: catVit.id,
      name: "Natovit Folic Acid 5mg 30 Tablets",
      slug: "natovit-folic-acid-5mg",
      description:
        "Folic acid supplementation for women of childbearing age and pregnancy support.",
      price: 680,
      comparePrice: 890,
      stock: 300,
      brand: "Hovid",
      tags: ["folic acid", "pregnancy", "prenatal"],
      isFeatured: true,
    },
    {
      partnerId: aaPharmacy.id,
      categoryId: catDevice.id,
      name: "Accu-Chek Instant Glucometer Starter Kit",
      slug: "accu-chek-instant-starter-kit",
      description:
        "Blood glucose meter starter kit for diabetes monitoring.",
      price: 9900,
      comparePrice: 12900,
      stock: 40,
      brand: "Roche",
      tags: ["glucometer", "diabetes", "blood sugar", "Bluetooth"],
      isFeatured: true,
    },
  ];

  for (const p of productsData) {
    const { requiresPrescription, ...rest } = p as any;
    await prisma.product.upsert({
      where: { partnerId_slug: { partnerId: p.partnerId, slug: p.slug } },
      update: {},
      create: {
        ...rest,
        requiresPrescription: requiresPrescription ?? false,
        isActive: true,
      },
    });
  }

  console.log("Products done");

  // ─── Services ────────────────────────────────────────────────────────────
  const servicesData = [
    // KPJ KL Specialist
    {
      partnerId: kpjKL.id,
      categoryId: catConsult.id,
      name: "General Practitioner Consultation",
      slug: "gp-consultation",
      description:
        "Walk-in GP consultation covering minor illnesses, medical certificates, and referrals.",
      price: 8000,
      durationMinutes: 30,
      isActive: true,
      isFeatured: true,
    },
    {
      partnerId: kpjKL.id,
      categoryId: catSpec.id,
      name: "Cardiology Specialist Consultation",
      slug: "cardiology-specialist-consultation",
      description:
        "Consultation with a board-certified cardiologist for cardiac assessment and management.",
      price: 35000,
      durationMinutes: 45,
      isActive: true,
      isFeatured: true,
    },
    {
      partnerId: kpjKL.id,
      categoryId: catDiag.id,
      name: "Comprehensive Blood Panel (Full Health Screen)",
      slug: "comprehensive-blood-panel",
      description:
        "Full health screening blood test package with GP review.",
      price: 28000,
      durationMinutes: 30,
      isActive: true,
      isFeatured: false,
    },
    {
      partnerId: kpjKL.id,
      categoryId: catSpec.id,
      name: "Orthopaedic Surgeon Consultation",
      slug: "orthopaedic-consultation",
      description:
        "Consultation for joint pain, fractures, sports injuries, and musculoskeletal issues.",
      price: 35000,
      durationMinutes: 45,
      isActive: true,
      isFeatured: false,
    },

    // Pantai Hospital
    {
      partnerId: pantai.id,
      categoryId: catConsult.id,
      name: "A&E Emergency Triage Consultation",
      slug: "ae-emergency-triage",
      description:
        "24-hour Accident & Emergency triage consultation.",
      price: 15000,
      durationMinutes: 60,
      isActive: true,
      isFeatured: true,
    },
    {
      partnerId: pantai.id,
      categoryId: catSpec.id,
      name: "Oncology Initial Consultation",
      slug: "oncology-initial-consultation",
      description:
        "Initial consultation with a certified oncologist for diagnosis review and treatment planning.",
      price: 45000,
      durationMinutes: 60,
      isActive: true,
      isFeatured: false,
    },
    {
      partnerId: pantai.id,
      categoryId: catDiag.id,
      name: "Digital Mammography Screening",
      slug: "digital-mammography-screening",
      description:
        "Digital mammography screening with radiologist report.",
      price: 38000,
      durationMinutes: 30,
      isActive: true,
      isFeatured: true,
    },

    // Dr Tan Family Clinic
    {
      partnerId: drTan.id,
      categoryId: catConsult.id,
      name: "GP Walk-In Consultation",
      slug: "gp-walk-in",
      description:
        "Walk-in consultation for common illnesses, referrals, medical certificates, and vaccinations.",
      price: 4500,
      durationMinutes: 20,
      isActive: true,
      isFeatured: true,
    },
    {
      partnerId: drTan.id,
      categoryId: catDiag.id,
      name: "Annual Health Screening Package",
      slug: "annual-health-screen-dr-tan",
      description:
        "Annual health screening with blood tests, urine analysis, and GP review.",
      price: 18000,
      durationMinutes: 60,
      isActive: true,
      isFeatured: true,
    },
    {
      partnerId: drTan.id,
      categoryId: catConsult.id,
      name: "COVID-19 RTK Antigen Test + Certificate",
      slug: "covid-rtk-test",
      description:
        "Rapid COVID-19 antigen test with official result certificate.",
      price: 5000,
      durationMinutes: 30,
      isActive: true,
      isFeatured: false,
    },

    // Poliklinik Wangsa Maju
    {
      partnerId: poliklinik.id,
      categoryId: catConsult.id,
      name: "Panel Doctor Consultation (Affordable)",
      slug: "panel-doctor-consultation",
      description:
        "Affordable GP consultation for common ailments and panel patients.",
      price: 3000,
      durationMinutes: 20,
      isActive: true,
      isFeatured: true,
    },
    {
      partnerId: poliklinik.id,
      categoryId: catConsult.id,
      name: "Child Vaccination (EPI Program)",
      slug: "child-vaccination-epi",
      description:
        "Vaccination services for infants and children under the EPI schedule.",
      price: 2500,
      durationMinutes: 30,
      isActive: true,
      isFeatured: false,
    },
  ];

  for (const s of servicesData) {
    await prisma.service.upsert({
      where: { partnerId_slug: { partnerId: s.partnerId, slug: s.slug } },
      update: {},
      create: { ...s, tags: [] },
    });
  }

  console.log("Services done");

  // ─── Promotions ──────────────────────────────────────────────────────────
  const now = new Date();
  const in60d = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  const in90d = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  const promos = [
    {
      code: "HEALTH10",
      title: "10% Off Health Products",
      description: "Save 10% on selected health essentials.",
      type: "PERCENTAGE" as const,
      status: "ACTIVE" as const,
      discountValue: 10,
      minOrderValue: 2000,
      startDate: now,
      endDate: in60d,
    },
    {
      code: "SERVICE50",
      title: "RM5 Off Clinic Services",
      description: "Get RM5 off selected clinic services with minimum spend RM80.",
      type: "FIXED_AMOUNT" as const,
      status: "ACTIVE" as const,
      discountValue: 500,
      minOrderValue: 8000,
      startDate: now,
      endDate: in90d,
    },
    {
      code: "NEWUSER20",
      title: "New User 20% Discount",
      description: "Enjoy 20% off your first reservation or purchase.",
      type: "PERCENTAGE" as const,
      status: "ACTIVE" as const,
      discountValue: 20,
      minOrderValue: 3000,
      maxDiscount: 3000,
      usageLimit: 500,
      startDate: now,
      endDate: in90d,
    },
    {
      code: "RAYA15",
      title: "Hari Raya Health Special",
      description: "15% off selected pharmacy products for the festive season.",
      type: "PERCENTAGE" as const,
      status: "ACTIVE" as const,
      discountValue: 15,
      minOrderValue: 5000,
      startDate: now,
      endDate: in60d,
    },
  ];

  for (const promo of promos) {
    await prisma.promotion.upsert({
      where: { code: promo.code },
      update: {},
      create: promo,
    });
  }

  console.log("Promotions done");

  // ─── Sample Customer Users ───────────────────────────────────────────────
  const customerHash = await bcrypt.hash("customer123", 12);
  const customerNames = [
    ["Ahmad Razif bin Abdullah", "ahmad.razif@example.com"],
    ["Nurul Ain binti Mohd Noor", "nurul.ain@example.com"],
    ["Raj Kumar Pillai", "raj.kumar@example.com"],
    ["Lim Mei Ying", "lim.meiying@example.com"],
    ["Priya Nair", "priya.nair@example.com"],
  ];

  await Promise.all(
    customerNames.map(([name, email]) =>
      prisma.user.upsert({
        where: { email },
        update: {},
        create: { name, email, passwordHash: customerHash, role: "CUSTOMER" },
      })
    )
  );

  console.log("Sample customers done");

  console.log("\nSeeding complete.\n");
  console.log("Login credentials:");
  console.log("  Admin:    admin@firxt.com / admin123");
  console.log("  Partner:  guardian.klcc@firxt.com / partner123");
  console.log("  Customer: ahmad.razif@example.com / customer123");
  console.log("\nPartners seeded (Phase 1 only):");
  partners.forEach((p) => console.log(`  [${p.type}] ${p.name}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());