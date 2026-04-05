import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
// import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding with KL data...");

  // ─── Admin ───────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@firxt.com" },
    update: {},
    create: { name: "FiRxt Admin", email: "admin@firxt.com", passwordHash: adminHash, role: "ADMIN" },
  });
  console.log("Admin:", admin.email);

  // ─── Categories ──────────────────────────────────────────────────────────
  const cats = await Promise.all([
    prisma.category.upsert({ where: { slug: "vitamins-supplements" }, update: {}, create: { name: "Vitamins & Supplements", slug: "vitamins-supplements" } }),
    prisma.category.upsert({ where: { slug: "cold-flu" }, update: {}, create: { name: "Cold & Flu", slug: "cold-flu" } }),
    prisma.category.upsert({ where: { slug: "pain-relief" }, update: {}, create: { name: "Pain Relief", slug: "pain-relief" } }),
    prisma.category.upsert({ where: { slug: "skincare" }, update: {}, create: { name: "Skincare & Personal Care", slug: "skincare" } }),
    prisma.category.upsert({ where: { slug: "medical-devices" }, update: {}, create: { name: "Medical Devices", slug: "medical-devices" } }),
    prisma.category.upsert({ where: { slug: "mother-baby" }, update: {}, create: { name: "Mother & Baby", slug: "mother-baby" } }),
    prisma.category.upsert({ where: { slug: "sports-nutrition" }, update: {}, create: { name: "Sports Nutrition", slug: "sports-nutrition" } }),
    prisma.category.upsert({ where: { slug: "digestive-health" }, update: {}, create: { name: "Digestive Health", slug: "digestive-health" } }),
    prisma.category.upsert({ where: { slug: "general-consultation" }, update: {}, create: { name: "General Consultation", slug: "general-consultation" } }),
    prisma.category.upsert({ where: { slug: "diagnostic-tests" }, update: {}, create: { name: "Diagnostic Tests", slug: "diagnostic-tests" } }),
    prisma.category.upsert({ where: { slug: "wellness-spa" }, update: {}, create: { name: "Wellness & Spa", slug: "wellness-spa" } }),
    prisma.category.upsert({ where: { slug: "specialist-care" }, update: {}, create: { name: "Specialist Care", slug: "specialist-care" } }),
  ]);

  const [catVit, catCold, catPain, catSkin, catDevice, catMomBaby, catSports, catDigest, catConsult, catDiag, catWellness, catSpec] = cats;
  console.log("Categories done");

  // ─── Partner Users ────────────────────────────────────────────────────────
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
    "truefit.montkiara@firxt.com",
    "blooms.wellness@firxt.com",
    "gribbles.pj@firxt.com",
    "synlab.kl@firxt.com",
  ];

  const partnerUsers = await Promise.all(
    partnerEmails.map((email, i) =>
      prisma.user.upsert({
        where: { email },
        update: {},
        create: { name: `Partner Owner ${i + 1}`, email, passwordHash: partnerHash, role: "PARTNER" },
      })
    )
  );
  console.log("Partner users done");

  // ─── Partners ─────────────────────────────────────────────────────────────
  const partnersData = [
    // ── PHARMACIES ──
    {
      userId: partnerUsers[0].id,
      slug: "guardian-pharmacy-klcc",
      name: "Guardian Pharmacy KLCC",
      type: "PHARMACY" as const,
      status: "APPROVED" as const,
      description: "Guardian Pharmacy at Suria KLCC — Malaysia's most trusted pharmacy chain offering a wide range of health products, beauty essentials, and professional pharmacist consultation. Open daily from 10am to 10pm.",
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
      description: "Caring Pharmacy in the heart of Bangsar, offering a curated selection of prescription medicines, OTC products, and healthcare advisory services. Our team of registered pharmacists is dedicated to your wellness.",
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
      description: "Watsons at Mid Valley Megamall — Asia's favourite health & beauty retailer. Find the best deals on skincare, haircare, personal wellness, vitamins and more. Loyalty card points redeemable in-store.",
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
      description: "AA Pharmacy serving the Chow Kit and surrounding communities since 1992. Affordable medicines, generic alternatives, and friendly neighbourhood pharmacist service. Specialising in chronic disease management supplies.",
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
      description: "KPJ Kuala Lumpur Specialist Hospital is a 255-bed private specialist hospital providing comprehensive tertiary healthcare services. Specialities include cardiology, oncology, orthopaedics, and neuroscience. ISO 9001 certified and MSQH accredited.",
      addressLine1: "No. 242A, Jalan Ampang",
      city: "Kuala Lumpur",
      state: "Federal Territory of Kuala Lumpur",
      postcode: "50450",
      latitude: 3.1570,
      longitude: 101.7220,
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
      description: "Pantai Hospital Kuala Lumpur has been providing quality healthcare to Malaysians for over 30 years. Home to more than 250 consultants across 40+ specialities. 24-hour emergency and trauma services available.",
      addressLine1: "No. 8, Jalan Bukit Pantai",
      city: "Kuala Lumpur",
      state: "Federal Territory of Kuala Lumpur",
      postcode: "59100",
      latitude: 3.1260,
      longitude: 101.6764,
      phone: "+60322963333",
      email: "pantai.kl@example.com",
      website: "https://www.pantai.com.my",
      tags: ["specialist", "hospital", "emergency", "Bangsar", "multi-specialist"],
      isVerified: true,
      approvedAt: new Date("2025-01-08"),
    },
    {
      userId: partnerUsers[6].id,
      slug: "dr-tan-family-clinic-damansara",
      name: "Dr. Tan's Family Clinic Damansara",
      type: "CLINIC" as const,
      status: "APPROVED" as const,
      description: "Friendly neighbourhood GP clinic in Damansara Heights. Dr. Tan Boon Keat (MBBS, MMed Family Medicine) offers comprehensive primary care for the whole family — from children to seniors. Walk-ins welcome.",
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
      description: "Community health clinic serving Wangsa Maju residents. We provide affordable primary care, child vaccinations, antenatal services, chronic disease management (diabetes, hypertension), and minor surgical procedures.",
      addressLine1: "No. 10, Jalan 2/27A, Seksyen 2",
      addressLine2: "Wangsa Maju",
      city: "Kuala Lumpur",
      state: "Federal Territory of Kuala Lumpur",
      postcode: "53300",
      latitude: 3.2066,
      longitude: 101.7333,
      phone: "+60341427788",
      email: "poliklinik.wm@example.com",
      tags: ["GP", "community clinic", "vaccination", "Wangsa Maju", "affordable"],
      isVerified: true,
      approvedAt: new Date("2025-02-15"),
    },
    // ── WELLNESS CENTRES ──
    {
      userId: partnerUsers[8].id,
      slug: "truefit-wellness-mont-kiara",
      name: "TrueFit Wellness Centre Mont Kiara",
      type: "WELLNESS_CENTER" as const,
      status: "APPROVED" as const,
      description: "TrueFit Wellness Centre is Mont Kiara's premier integrated wellness destination. We offer personal training, yoga, pilates, sports massage, nutritional coaching, and health screening packages. State-of-the-art facilities with certified trainers.",
      addressLine1: "Level 3, Solaris Mont Kiara",
      addressLine2: "No. 2, Jalan Solaris",
      city: "Kuala Lumpur",
      state: "Federal Territory of Kuala Lumpur",
      postcode: "50480",
      latitude: 3.1725,
      longitude: 101.6481,
      phone: "+60362019988",
      email: "truefit@example.com",
      website: "https://www.truefit.com.my",
      tags: ["fitness", "yoga", "pilates", "massage", "Mont Kiara", "wellness"],
      isVerified: true,
      approvedAt: new Date("2025-01-25"),
    },
    {
      userId: partnerUsers[9].id,
      slug: "blooms-wellness-hartamas",
      name: "Blooms Wellness & Spa Hartamas",
      type: "WELLNESS_CENTER" as const,
      status: "APPROVED" as const,
      description: "Blooms Wellness & Spa is a boutique holistic wellness centre in Sri Hartamas. Specialising in traditional and modern therapy including Traditional Chinese Medicine (TCM), aromatherapy massages, reflexology, and mindfulness retreats.",
      addressLine1: "No. 56-1, Jalan Sri Hartamas 8",
      addressLine2: "Sri Hartamas",
      city: "Kuala Lumpur",
      state: "Federal Territory of Kuala Lumpur",
      postcode: "50480",
      latitude: 3.1674,
      longitude: 101.6476,
      phone: "+60362015599",
      email: "blooms@example.com",
      tags: ["spa", "TCM", "massage", "reflexology", "Hartamas", "holistic"],
      isVerified: true,
      approvedAt: new Date("2025-02-05"),
    },
    // ── LABS ──
    {
      userId: partnerUsers[10].id,
      slug: "gribbles-pathology-pj",
      name: "Gribbles Pathology Petaling Jaya",
      type: "LAB" as const,
      status: "APPROVED" as const,
      description: "Gribbles Pathology is one of Malaysia's leading private pathology service providers. We offer a comprehensive range of diagnostic tests including haematology, biochemistry, microbiology, immunology, and molecular diagnostics. Results within 24–48 hours.",
      addressLine1: "No. 2, Jalan 13/6",
      addressLine2: "Section 13",
      city: "Petaling Jaya",
      state: "Selangor",
      postcode: "46200",
      latitude: 3.1073,
      longitude: 101.6067,
      phone: "+60379552688",
      email: "gribbles.pj@example.com",
      website: "https://www.gribbles.com.my",
      tags: ["lab", "pathology", "blood test", "diagnostic", "Petaling Jaya"],
      isVerified: true,
      approvedAt: new Date("2025-01-12"),
    },
    {
      userId: partnerUsers[11].id,
      slug: "synlab-diagnostics-klcc",
      name: "SYNLAB Diagnostics Kuala Lumpur",
      type: "LAB" as const,
      status: "APPROVED" as const,
      description: "SYNLAB is Europe's largest laboratory diagnostics provider, now in Kuala Lumpur. Offering over 3,000 laboratory tests with rapid turnaround. Specialised in oncology markers, hormone panels, genetic screening, and comprehensive health screenings.",
      addressLine1: "Suite 13A-01, Level 13A, Menara IGB",
      addressLine2: "Mid Valley City, Lingkaran Syed Putra",
      city: "Kuala Lumpur",
      state: "Federal Territory of Kuala Lumpur",
      postcode: "59200",
      latitude: 3.1193,
      longitude: 101.6786,
      phone: "+60322829588",
      email: "synlab.kl@example.com",
      website: "https://www.synlab.com.my",
      tags: ["lab", "diagnostic", "oncology markers", "genetic", "Mid Valley"],
      isVerified: true,
      approvedAt: new Date("2025-01-18"),
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

  const [guardianKLCC, caringBangsar, watsons, aaPharmacy, kpjKL, pantai, drTan, poliklinik, trueFit, blooms, gribbles, synlab] = partners;

  // ─── Products ─────────────────────────────────────────────────────────────
  const productsData = [
    // Guardian KLCC
    { partnerId: guardianKLCC.id, categoryId: catVit.id, name: "Blackmores Vitamin C 1000mg 60 Tablets", slug: "blackmores-vitamin-c-1000mg", description: "High-strength Vitamin C providing powerful antioxidant support and immune defense. Each tablet contains 1000mg of ascorbic acid. Suitable for adults and children above 12.", price: 3290, comparePrice: 3890, stock: 150, brand: "Blackmores", tags: ["vitamin C", "immune", "antioxidant"], isFeatured: true },
    { partnerId: guardianKLCC.id, categoryId: catVit.id, name: "Shaklee Vita-E 400IU 90 Softgels", slug: "shaklee-vita-e-400iu", description: "Natural Vitamin E from soybean oil. Each softgel delivers 400IU of d-alpha tocopherol — a powerful fat-soluble antioxidant that protects cells from oxidative stress.", price: 8990, comparePrice: 9590, stock: 60, brand: "Shaklee", tags: ["vitamin E", "antioxidant", "softgel"], isFeatured: false },
    { partnerId: guardianKLCC.id, categoryId: catSkin.id, name: "Cetaphil Moisturising Cream 250g", slug: "cetaphil-moisturising-cream-250g", description: "Cetaphil Moisturising Cream provides immediate and long-lasting relief for dry, sensitive skin. Non-comedogenic, fragrance-free, dermatologist-tested formula safe for daily use on face and body.", price: 3490, comparePrice: 3990, stock: 200, brand: "Cetaphil", tags: ["moisturiser", "sensitive skin", "fragrance-free"], isFeatured: true },
    { partnerId: guardianKLCC.id, categoryId: catPain.id, name: "Panadol Extra 500mg/65mg 20 Tablets", slug: "panadol-extra-500mg", description: "Panadol Extra with Optizorb formulation provides fast and effective relief from headaches, migraines, backache, dental pain, and fever. Each tablet contains paracetamol 500mg and caffeine 65mg.", price: 680, comparePrice: 780, stock: 300, brand: "Panadol", tags: ["paracetamol", "headache", "fever", "pain"], isFeatured: false },
    { partnerId: guardianKLCC.id, categoryId: catDevice.id, name: "Omron HEM-7156T Automatic Blood Pressure Monitor", slug: "omron-hem-7156t-bp-monitor", description: "Omron HEM-7156T upper arm blood pressure monitor with Bluetooth connectivity. Clinically validated for accuracy. Detects irregular heartbeat. Stores 60 readings per user (2 users).", price: 19900, comparePrice: 24900, stock: 30, brand: "Omron", tags: ["blood pressure", "monitor", "Bluetooth", "Omron"], isFeatured: true },
    { partnerId: guardianKLCC.id, categoryId: catSports.id, name: "Optimum Nutrition Gold Standard 100% Whey 2lb (Chocolate)", slug: "on-gold-standard-whey-2lb-choc", description: "The world's best-selling whey protein. Each serving delivers 24g of protein, 5.5g of BCAAs, and 4g of glutamine. Fast-digesting for post-workout recovery. Chocolate flavour.", price: 18900, comparePrice: 21900, stock: 45, brand: "Optimum Nutrition", tags: ["protein", "whey", "gym", "BCAAs", "recovery"], isFeatured: false },

    // Caring Pharmacy Bangsar
    { partnerId: caringBangsar.id, categoryId: catCold.id, name: "Clarinase Repetabs 12-Hour Relief 10 Tablets", slug: "clarinase-repetabs-10s", description: "Clarinase provides 12-hour relief from allergic rhinitis symptoms including runny nose, sneezing, nasal congestion, and watery eyes. Contains loratadine 5mg + pseudoephedrine 120mg.", price: 1890, comparePrice: 2190, stock: 120, brand: "MSD", tags: ["allergy", "rhinitis", "non-drowsy", "nasal"], isFeatured: true },
    { partnerId: caringBangsar.id, categoryId: catDigest.id, name: "Gaviscon Advance Aniseed 500ml", slug: "gaviscon-advance-aniseed-500ml", description: "Gaviscon Advance forms a protective layer over stomach contents, relieving heartburn and acid reflux. Fast-acting, long-lasting relief. Pleasant aniseed flavour. Suitable for use during pregnancy.", price: 3190, comparePrice: 3490, stock: 80, brand: "Gaviscon", tags: ["heartburn", "acid reflux", "GERD", "antacid"], isFeatured: false },
    { partnerId: caringBangsar.id, categoryId: catVit.id, name: "Neurobion Forte B1+B6+B12 60 Tablets", slug: "neurobion-forte-b-complex", description: "Neurobion Forte contains a synergistic blend of B vitamins (B1, B6, B12) to support peripheral nerve health, reduce nerve pain, and maintain energy metabolism. Clinician-recommended.", price: 2490, comparePrice: 2890, stock: 200, brand: "Merck", tags: ["vitamin B", "nerve health", "energy", "neurobion"], isFeatured: true },
    { partnerId: caringBangsar.id, categoryId: catSkin.id, name: "Bepanthen Nappy Care Ointment 100g", slug: "bepanthen-nappy-care-100g", description: "Bepanthen Nappy Care Ointment protects delicate baby skin from nappy rash. Contains 5% dexpanthenol (provitamin B5). Fragrance-free, preservative-free, clinically tested.", price: 2290, comparePrice: 2590, stock: 95, brand: "Bepanthen", tags: ["baby", "nappy rash", "dexpanthenol", "gentle"], isFeatured: false },
    { partnerId: caringBangsar.id, categoryId: catDevice.id, name: "Braun ThermoScan 7 IRT6520 Ear Thermometer", slug: "braun-thermoscan7-ear-thermometer", description: "The Braun ThermoScan 7 provides precise ear temperature readings in seconds. Age Precision® technology recommends colour-coded readings for babies, children, and adults. Includes 21 disposable lens filters.", price: 24900, comparePrice: 28500, stock: 25, brand: "Braun", tags: ["thermometer", "ear", "baby", "temperature", "Braun"], isFeatured: true },

    // Watsons Mid Valley
    { partnerId: watsons.id, categoryId: catSkin.id, name: "CeraVe Hydrating Facial Cleanser 236ml", slug: "cerave-hydrating-facial-cleanser-236ml", description: "CeraVe Hydrating Facial Cleanser gently cleanses without disrupting the skin's protective barrier. Formulated with 3 essential ceramides and hyaluronic acid. Non-comedogenic, fragrance-free, suitable for normal to dry skin.", price: 3890, comparePrice: 4290, stock: 180, brand: "CeraVe", tags: ["cleanser", "ceramide", "hydrating", "sensitive"], isFeatured: true },
    { partnerId: watsons.id, categoryId: catSkin.id, name: "La Roche-Posay Anthelios SPF50+ Fluid 50ml", slug: "la-roche-posay-anthelios-spf50", description: "La Roche-Posay Anthelios sunscreen with ultra-light fluid texture. Very high UVA/UVB protection. Suitable for sensitive skin and daily urban use. Tested under extreme conditions.", price: 8590, comparePrice: 9290, stock: 100, brand: "La Roche-Posay", tags: ["sunscreen", "SPF50", "UV protection", "sensitive skin"], isFeatured: false },
    { partnerId: watsons.id, categoryId: catVit.id, name: "Vitagen Collagen + Vitamin C 10 sachets", slug: "vitagen-collagen-vitamin-c-sachets", description: "Each sachet contains 5000mg marine collagen peptides + Vitamin C for skin elasticity, joint support, and brightening. Tropical fruit flavour. Dissolves easily in water or juice.", price: 7990, comparePrice: 8990, stock: 120, brand: "Vitagen", tags: ["collagen", "marine", "skin", "brightening"], isFeatured: true },
    { partnerId: watsons.id, categoryId: catMomBaby.id, name: "Similac Gain Plus Stage 3 (1-3 years) 1.7kg", slug: "similac-gain-plus-stage3-1-7kg", description: "Similac Gain Plus is a growing-up milk formula for children aged 1–3. Contains EyeQ Plus system with DHA, ARA, and Lutein for brain and eye development. Added with prebiotics for healthy digestion.", price: 8990, comparePrice: 9890, stock: 50, brand: "Abbott", tags: ["formula milk", "toddler", "DHA", "growing-up milk"], isFeatured: false },

    // AA Pharmacy Chow Kit
    { partnerId: aaPharmacy.id, categoryId: catPain.id, name: "Arcoxia 90mg Tablets (Pack of 14)", slug: "arcoxia-90mg-14s", description: "Arcoxia (etoricoxib) is a COX-2 selective NSAID for relief of osteoarthritis, rheumatoid arthritis, ankylosing spondylitis, and acute gout. Prescription required. Dispensed by registered pharmacist.", price: 4800, comparePrice: 5500, stock: 60, brand: "MSD", requiresPrescription: true, tags: ["NSAID", "arthritis", "gout", "pain"], isFeatured: false },
    { partnerId: aaPharmacy.id, categoryId: catDigest.id, name: "Nexium 20mg Esomeprazole 14 Capsules", slug: "nexium-20mg-14s", description: "Nexium (esomeprazole) is a proton pump inhibitor (PPI) used for treatment of GERD, gastric and duodenal ulcers. Reduces acid production for symptom relief and healing. Prescription required.", price: 3600, comparePrice: 4200, stock: 80, brand: "AstraZeneca", requiresPrescription: true, tags: ["PPI", "GERD", "ulcer", "stomach"], isFeatured: false },
    { partnerId: aaPharmacy.id, categoryId: catVit.id, name: "Natovit Folic Acid 5mg 30 Tablets", slug: "natovit-folic-acid-5mg", description: "Folic acid supplementation for women of childbearing age, pregnant women, and those with folate deficiency. Essential for neural tube development in early pregnancy. 5mg therapeutic dose.", price: 680, comparePrice: 890, stock: 300, brand: "Hovid", tags: ["folic acid", "pregnancy", "prenatal", "neural tube"], isFeatured: true },
    { partnerId: aaPharmacy.id, categoryId: catDevice.id, name: "Accu-Chek Instant Glucometer Starter Kit", slug: "accu-chek-instant-starter-kit", description: "Accu-Chek Instant blood glucose meter with Bluetooth connectivity to mySugr app. Includes 10 test strips, 10 lancets, and lancing device. Accurate within ±10% of reference. For diabetes management.", price: 9900, comparePrice: 12900, stock: 40, brand: "Roche", tags: ["glucometer", "diabetes", "blood sugar", "Bluetooth"], isFeatured: true },
  ];

  for (const p of productsData) {
    const { requiresPrescription, ...rest } = p as any;
    await prisma.product.upsert({
      where: { partnerId_slug: { partnerId: p.partnerId, slug: p.slug } },
      update: {},
      create: { ...rest, requiresPrescription: requiresPrescription ?? false, isActive: true },
    });
  }
  console.log("Products done");

  // ─── Services ─────────────────────────────────────────────────────────────
  const servicesData = [
    // KPJ KL Specialist
    { partnerId: kpjKL.id, categoryId: catConsult.id, name: "General Practitioner Consultation", slug: "gp-consultation", description: "Walk-in GP consultation at KPJ Kuala Lumpur. Covers minor illnesses, medical certificates, health screenings, and referrals to specialists. Registration at Level 1 counter.", price: 8000, durationMinutes: 30, isActive: true, isFeatured: true },
    { partnerId: kpjKL.id, categoryId: catSpec.id, name: "Cardiology Specialist Consultation", slug: "cardiology-specialist-consultation", description: "Consultation with a board-certified cardiologist. Covers assessment of chest pain, palpitations, hypertension, heart failure, and valvular disease. Referral letter from GP recommended.", price: 35000, durationMinutes: 45, isActive: true, isFeatured: true },
    { partnerId: kpjKL.id, categoryId: catDiag.id, name: "Comprehensive Blood Panel (Full Health Screen)", slug: "comprehensive-blood-panel", description: "Full health screening blood test package: FBC, renal function, liver function, lipid panel, fasting glucose, HbA1c, thyroid function (TSH, FT4), uric acid, urine FEME. Results in 24 hours.", price: 28000, durationMinutes: 30, isActive: true, isFeatured: false },
    { partnerId: kpjKL.id, categoryId: catSpec.id, name: "Orthopaedic Surgeon Consultation", slug: "orthopaedic-consultation", description: "Consult our experienced orthopaedic surgeons for joint pain, fractures, sports injuries, spine problems, and musculoskeletal disorders. Includes physical examination and management plan.", price: 35000, durationMinutes: 45, isActive: true, isFeatured: false },

    // Pantai Hospital
    { partnerId: pantai.id, categoryId: catConsult.id, name: "A&E Emergency Triage Consultation", slug: "ae-emergency-triage", description: "24-hour Accident & Emergency Department at Pantai Hospital KL. Equipped to handle all acute medical and surgical emergencies. Triage system ensures most critical cases are seen first.", price: 15000, durationMinutes: 60, isActive: true, isFeatured: true },
    { partnerId: pantai.id, categoryId: catSpec.id, name: "Oncology Initial Consultation", slug: "oncology-initial-consultation", description: "Initial consultation with a certified oncologist for cancer screening, diagnosis review, and treatment planning. Covers breast, colorectal, lung, and other cancers. Multidisciplinary team approach.", price: 45000, durationMinutes: 60, isActive: true, isFeatured: false },
    { partnerId: pantai.id, categoryId: catDiag.id, name: "Digital Mammography Screening", slug: "digital-mammography-screening", description: "Digital mammography for early detection of breast cancer. Recommended annually for women above 40. Performed by experienced radiographers. Radiologist report within 48 hours.", price: 38000, durationMinutes: 30, isActive: true, isFeatured: true },

    // Dr Tan Family Clinic
    { partnerId: drTan.id, categoryId: catConsult.id, name: "GP Walk-In Consultation", slug: "gp-walk-in", description: "Walk-in consultation with Dr. Tan Boon Keat (MBBS, MMed). Covers common illnesses, referrals, medical certificates, vaccinations, and chronic disease follow-ups. No appointment needed.", price: 4500, durationMinutes: 20, isActive: true, isFeatured: true },
    { partnerId: drTan.id, categoryId: catDiag.id, name: "Annual Health Screening Package", slug: "annual-health-screen-dr-tan", description: "Comprehensive annual health screening: blood pressure, BMI, full blood count, cholesterol, blood glucose, kidney function, liver function, Hepatitis B, urine analysis. Includes GP review and report.", price: 18000, durationMinutes: 60, isActive: true, isFeatured: true },
    { partnerId: drTan.id, categoryId: catConsult.id, name: "COVID-19 RTK Antigen Test + Certificate", slug: "covid-rtk-test", description: "Rapid COVID-19 antigen test (RTK-Ag) with official result certificate for travel or employer requirements. Results in 15–30 minutes. Administered by trained medical staff.", price: 5000, durationMinutes: 30, isActive: true, isFeatured: false },

    // Poliklinik Wangsa Maju
    { partnerId: poliklinik.id, categoryId: catConsult.id, name: "Panel Doctor Consultation (Affordable)", slug: "panel-doctor-consultation", description: "Affordable GP consultation for common ailments including fever, cough, diarrhoea, and skin conditions. Panel clinic for most corporate insurance and government panels.", price: 3000, durationMinutes: 20, isActive: true, isFeatured: true },
    { partnerId: poliklinik.id, categoryId: catConsult.id, name: "Child Vaccination (EPI Program)", slug: "child-vaccination-epi", description: "Government EPI (Expanded Programme on Immunisation) vaccinations for infants and children. Includes BCG, Hepatitis B, DTaP, Hib, IPV, MMR, and Varicella. Vaccination card provided.", price: 2500, durationMinutes: 30, isActive: true, isFeatured: false },

    // TrueFit Mont Kiara
    { partnerId: trueFit.id, categoryId: catWellness.id, name: "Personal Training Session (60 min)", slug: "personal-training-60min", description: "One-on-one personal training session with a certified fitness coach at TrueFit Mont Kiara. Tailored program for weight loss, muscle building, or athletic conditioning. Equipment provided.", price: 18000, durationMinutes: 60, isActive: true, isFeatured: true },
    { partnerId: trueFit.id, categoryId: catWellness.id, name: "Hatha Yoga Class (Drop-In)", slug: "hatha-yoga-drop-in", description: "Drop-in Hatha Yoga class suitable for beginners to intermediate practitioners. Focuses on posture alignment, breathing, and mindfulness. Mats and props provided. Max 12 participants.", price: 5500, durationMinutes: 60, isActive: true, isFeatured: true },
    { partnerId: trueFit.id, categoryId: catWellness.id, name: "Sports Deep Tissue Massage (90 min)", slug: "sports-deep-tissue-massage-90min", description: "Therapeutic deep tissue massage targeting muscle tension, sports injuries, and chronic pain. Our certified sports massage therapist addresses trigger points and realigns muscle fibres.", price: 25000, durationMinutes: 90, isActive: true, isFeatured: false },
    { partnerId: trueFit.id, categoryId: catWellness.id, name: "InBody Body Composition Analysis", slug: "inbody-body-composition-analysis", description: "Precise body composition scan using InBody 970 technology. Measures muscle mass, fat mass, visceral fat, metabolic rate, and segmental analysis. Includes 30-min nutritional coaching session.", price: 15000, durationMinutes: 45, isActive: true, isFeatured: false },

    // Blooms Wellness Hartamas
    { partnerId: blooms.id, categoryId: catWellness.id, name: "Traditional Chinese Medicine (TCM) Consultation", slug: "tcm-consultation", description: "Consultation with a registered TCM practitioner. Assessment includes tongue and pulse diagnosis. Covers acupuncture referral, herbal formulation, and cupping therapy recommendations.", price: 12000, durationMinutes: 45, isActive: true, isFeatured: true },
    { partnerId: blooms.id, categoryId: catWellness.id, name: "Full Body Aromatherapy Massage (60 min)", slug: "aromatherapy-massage-60min", description: "Relaxing full body massage using premium essential oils blended to your mood — relax, energise, or balance. Gentle Swedish strokes promote circulation and deep relaxation. Includes scalp massage.", price: 18000, durationMinutes: 60, isActive: true, isFeatured: true },
    { partnerId: blooms.id, categoryId: catWellness.id, name: "Reflexology Foot Treatment (45 min)", slug: "reflexology-foot-treatment", description: "Traditional reflexology targeting pressure points on the feet that correspond to organs and systems throughout the body. Relieves tension, improves circulation, and promotes overall wellbeing.", price: 9000, durationMinutes: 45, isActive: true, isFeatured: false },

    // Gribbles PJ
    { partnerId: gribbles.id, categoryId: catDiag.id, name: "Basic Health Screen (Fasting Required)", slug: "gribbles-basic-health-screen", description: "Basic health screening panel: full blood count (FBC), fasting blood glucose, total cholesterol, HDL, LDL, triglycerides, creatinine, SGPT, SGOT, uric acid, urine FEME. E-report in 24 hrs.", price: 12000, durationMinutes: 20, isActive: true, isFeatured: true },
    { partnerId: gribbles.id, categoryId: catDiag.id, name: "STI Comprehensive Screen", slug: "gribbles-sti-screen", description: "Confidential STI screening panel: HIV Ag/Ab combo, Syphilis TPHA, Hepatitis B sAg, Hepatitis C Ab, Chlamydia/Gonorrhoea NAAT (urine). Results in 3–5 working days. Counselling available.", price: 35000, durationMinutes: 20, isActive: true, isFeatured: false },
    { partnerId: gribbles.id, categoryId: catDiag.id, name: "COVID-19 PCR Test (Travel Certificate)", slug: "gribbles-covid-pcr", description: "Real-time PCR test for COVID-19 detection. Official MOH-approved laboratory report suitable for international travel. Results within 24 hours. Walk-in accepted, no appointment needed.", price: 18000, durationMinutes: 20, isActive: true, isFeatured: false },

    // SYNLAB KL
    { partnerId: synlab.id, categoryId: catDiag.id, name: "Female Wellness Hormone Panel", slug: "synlab-female-hormone-panel", description: "Comprehensive female hormone assessment: LH, FSH, Oestradiol, Progesterone, Prolactin, Testosterone, DHEAS, AMH (ovarian reserve), and SHBG. Ideal for fertility evaluation and hormonal imbalance. Fasting required.", price: 45000, durationMinutes: 30, isActive: true, isFeatured: true },
    { partnerId: synlab.id, categoryId: catDiag.id, name: "Executive Health Screen Platinum", slug: "synlab-executive-platinum", description: "Our most comprehensive executive health package: 80+ tests including tumour markers (PSA, CEA, CA19-9, AFP), cardiac markers, liver fibrosis, heavy metals, allergy profile, plus GP consultation and personalised health report.", price: 98000, durationMinutes: 90, isActive: true, isFeatured: true },
    { partnerId: synlab.id, categoryId: catDiag.id, name: "BRCA1/BRCA2 Genetic Screening", slug: "synlab-brca-genetic-screening", description: "Next-generation sequencing (NGS) for BRCA1 and BRCA2 gene mutations associated with hereditary breast and ovarian cancer. Includes pre- and post-test genetic counselling. 14-day turnaround.", price: 280000, durationMinutes: 60, isActive: true, isFeatured: false },
  ];

  for (const s of servicesData) {
    await prisma.service.upsert({
      where: { partnerId_slug: { partnerId: s.partnerId, slug: s.slug } },
      update: {},
      create: { ...s, tags: [] },
    });
  }
  console.log("Services done");

  // ─── Promotions ───────────────────────────────────────────────────────────
  const now = new Date();
  const in60d = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  const in90d = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  const promos = [
    { code: "HEALTH10", title: "10% Off Health Products", description: "Save 10% on all health and wellness purchases. Valid sitewide.", type: "PERCENTAGE" as const, status: "ACTIVE" as const, discountValue: 10, minOrderValue: 2000, startDate: now, endDate: in60d },
    { code: "WELLNESS50", title: "RM5 Off Wellness Services", description: "Get RM5 off any wellness service booking. Minimum spend RM80.", type: "FIXED_AMOUNT" as const, status: "ACTIVE" as const, discountValue: 500, minOrderValue: 8000, startDate: now, endDate: in90d },
    { code: "FREESHIP", title: "Free Delivery", description: "Free delivery on all orders — no minimum spend required. Limited time offer.", type: "FREE_SHIPPING" as const, status: "ACTIVE" as const, discountValue: 0, startDate: now, endDate: in60d },
    { code: "NEWUSER20", title: "New User 20% Discount", description: "Welcome to FiRxt! Enjoy 20% off your very first order. One-time use per account.", type: "PERCENTAGE" as const, status: "ACTIVE" as const, discountValue: 20, minOrderValue: 3000, maxDiscount: 3000, usageLimit: 500, startDate: now, endDate: in90d },
    { code: "RAYA15", title: "Hari Raya Health Special", description: "Celebrate Hari Raya with 15% off all pharmacy products. Stock up on health essentials for the festive season.", type: "PERCENTAGE" as const, status: "ACTIVE" as const, discountValue: 15, minOrderValue: 5000, startDate: now, endDate: in60d },
  ];

  for (const promo of promos) {
    await prisma.promotion.upsert({
      where: { code: promo.code },
      update: {},
      create: promo,
    });
  }
  console.log("Promotions done");

  // ─── Sample Customer Users ────────────────────────────────────────────────
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

  console.log("\n✅ Seeding complete!\n");
  console.log("Login credentials:");
  console.log("  Admin:    admin@firxt.com / admin123");
  console.log("  Partner:  guardian.klcc@firxt.com / partner123");
  console.log("  Customer: ahmad.razif@example.com / customer123");
  console.log("\nPartners seeded (all APPROVED):");
  partners.forEach((p) => console.log(`  [${p.type}] ${p.name}`));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
