import type { Vertical } from "@/contexts/VerticalContext";

export interface CategoryItem {
  value: string;
  label: string;
  subcategories?: { value: string; label: string }[];
}

export const VERTICAL_CATEGORIES: Record<Vertical, CategoryItem[]> = {
  luxe: [
    {
      value: "watches",
      label: "Orë",
      subcategories: [
        { value: "watches-luxury", label: "Orë Luksoze" },
        { value: "watches-vintage", label: "Orë Vintage" },
        { value: "watches-smart", label: "Smartwatch Premium" },
        { value: "watches-pocket", label: "Orë Xhepi" },
      ],
    },
    {
      value: "bags",
      label: "Çanta",
      subcategories: [
        { value: "bags-handbags", label: "Çanta Dore" },
        { value: "bags-backpacks", label: "Çanta Shpine" },
        { value: "bags-clutch", label: "Clutch" },
        { value: "bags-travel", label: "Çanta Udhëtimi" },
      ],
    },
    {
      value: "jewelry",
      label: "Bizhuteri",
      subcategories: [
        { value: "jewelry-rings", label: "Unaza" },
        { value: "jewelry-necklaces", label: "Gjerdan" },
        { value: "jewelry-bracelets", label: "Byzylyk" },
        { value: "jewelry-earrings", label: "Vathë" },
      ],
    },
    {
      value: "fashion",
      label: "Modë Luksoze",
      subcategories: [
        { value: "fashion-dresses", label: "Fustane" },
        { value: "fashion-suits", label: "Kostume" },
        { value: "fashion-shoes", label: "Këpucë" },
        { value: "fashion-accessories", label: "Aksesorë" },
      ],
    },
    {
      value: "art",
      label: "Art & Koleksione",
      subcategories: [
        { value: "art-paintings", label: "Piktura" },
        { value: "art-sculptures", label: "Skulptura" },
        { value: "art-antiques", label: "Antikvare" },
        { value: "art-coins", label: "Monedha & Pulla" },
      ],
    },
    { value: "other-luxe", label: "Tjetër" },
  ],
  market: [
    {
      value: "electronics",
      label: "Elektronikë",
      subcategories: [
        { value: "electronics-phones", label: "Telefona" },
        { value: "electronics-laptops", label: "Laptopë" },
        { value: "electronics-tablets", label: "Tableta" },
        { value: "electronics-tv", label: "TV & Audio" },
        { value: "electronics-gaming", label: "Gaming" },
        { value: "electronics-cameras", label: "Kamera" },
      ],
    },
    {
      value: "furniture",
      label: "Mobilje",
      subcategories: [
        { value: "furniture-living", label: "Dhomë Ndenjeje" },
        { value: "furniture-bedroom", label: "Dhomë Gjumi" },
        { value: "furniture-kitchen", label: "Kuzhinë" },
        { value: "furniture-office", label: "Zyrë" },
        { value: "furniture-garden", label: "Kopsht" },
      ],
    },
    {
      value: "clothing",
      label: "Veshje",
      subcategories: [
        { value: "clothing-men", label: "Për Meshkuj" },
        { value: "clothing-women", label: "Për Femra" },
        { value: "clothing-kids", label: "Për Fëmijë" },
        { value: "clothing-shoes", label: "Këpucë" },
        { value: "clothing-sportswear", label: "Veshje Sportive" },
      ],
    },
    {
      value: "home",
      label: "Shtëpi & Kopsht",
      subcategories: [
        { value: "home-appliances", label: "Pajisje Shtëpie" },
        { value: "home-decor", label: "Dekor" },
        { value: "home-tools", label: "Vegla" },
        { value: "home-garden", label: "Kopsht" },
      ],
    },
    {
      value: "sports",
      label: "Sport & Natyrë",
      subcategories: [
        { value: "sports-fitness", label: "Fitnes" },
        { value: "sports-bicycles", label: "Biçikleta" },
        { value: "sports-camping", label: "Kamping" },
        { value: "sports-water", label: "Sporte Ujore" },
      ],
    },
    {
      value: "vehicles",
      label: "Automjete",
      subcategories: [
        { value: "vehicles-cars", label: "Makina" },
        { value: "vehicles-motorcycles", label: "Motorë" },
        { value: "vehicles-parts", label: "Pjesë Këmbimi" },
        { value: "vehicles-accessories", label: "Aksesorë" },
      ],
    },
    {
      value: "books",
      label: "Libra & Media",
      subcategories: [
        { value: "books-textbooks", label: "Tekste Shkollore" },
        { value: "books-novels", label: "Romane" },
        { value: "books-comics", label: "Komike" },
        { value: "books-music", label: "Muzikë & Filma" },
      ],
    },
    { value: "other-market", label: "Tjetër" },
  ],
  rent: [
    {
      value: "apartments",
      label: "Banesa",
      subcategories: [
        { value: "apartments-studio", label: "Garsonierë" },
        { value: "apartments-1bed", label: "1+1" },
        { value: "apartments-2bed", label: "2+1" },
        { value: "apartments-3bed", label: "3+1 e Më Shumë" },
        { value: "apartments-penthouse", label: "Penthouse" },
      ],
    },
    {
      value: "houses",
      label: "Shtëpi & Vila",
      subcategories: [
        { value: "houses-house", label: "Shtëpi" },
        { value: "houses-villa", label: "Vila" },
        { value: "houses-townhouse", label: "Shtëpi Radhë" },
        { value: "houses-vacation", label: "Pushimore" },
      ],
    },
    {
      value: "commercial",
      label: "Komerciale",
      subcategories: [
        { value: "commercial-office", label: "Zyrë" },
        { value: "commercial-shop", label: "Dyqan" },
        { value: "commercial-warehouse", label: "Magazinë" },
        { value: "commercial-land", label: "Tokë" },
      ],
    },
    {
      value: "vehicles-rent",
      label: "Automjete",
      subcategories: [
        { value: "vehicles-rent-car", label: "Makina" },
        { value: "vehicles-rent-van", label: "Furgon" },
        { value: "vehicles-rent-motorcycle", label: "Motor" },
        { value: "vehicles-rent-bicycle", label: "Biçikletë" },
      ],
    },
    {
      value: "equipment",
      label: "Pajisje & Vegla",
      subcategories: [
        { value: "equipment-construction", label: "Ndërtim" },
        { value: "equipment-event", label: "Evente" },
        { value: "equipment-photo", label: "Foto & Video" },
        { value: "equipment-medical", label: "Mjekësore" },
      ],
    },
    { value: "other-rent", label: "Tjetër" },
  ],
  services: [
    {
      value: "home-services",
      label: "Shtëpi & Mirëmbajtje",
      subcategories: [
        { value: "home-services-plumbing", label: "Hidraulik" },
        { value: "home-services-electrical", label: "Elektricist" },
        { value: "home-services-cleaning", label: "Pastrim" },
        { value: "home-services-painting", label: "Lyerje" },
        { value: "home-services-renovation", label: "Rinovim" },
      ],
    },
    {
      value: "education",
      label: "Edukim & Mësime",
      subcategories: [
        { value: "education-tutoring", label: "Mësime Private" },
        { value: "education-languages", label: "Gjuhë të Huaja" },
        { value: "education-music", label: "Muzikë" },
        { value: "education-driving", label: "Auto-shkollë" },
      ],
    },
    {
      value: "beauty",
      label: "Bukuri & Shëndet",
      subcategories: [
        { value: "beauty-hair", label: "Flokë" },
        { value: "beauty-nails", label: "Thonjtë" },
        { value: "beauty-makeup", label: "Grim" },
        { value: "beauty-massage", label: "Masazh" },
        { value: "beauty-fitness", label: "Personal Trainer" },
      ],
    },
    {
      value: "tech-services",
      label: "Teknologji",
      subcategories: [
        { value: "tech-services-web", label: "Ueb Dizajn" },
        { value: "tech-services-dev", label: "Programim" },
        { value: "tech-services-repair", label: "Riparim PC/Tel" },
        { value: "tech-services-seo", label: "Marketing Digjital" },
      ],
    },
    {
      value: "events",
      label: "Evente & Argëtim",
      subcategories: [
        { value: "events-photography", label: "Fotografi" },
        { value: "events-videography", label: "Videografi" },
        { value: "events-dj", label: "DJ & Muzikë" },
        { value: "events-catering", label: "Katering" },
        { value: "events-planning", label: "Organizim" },
      ],
    },
    {
      value: "professional",
      label: "Shërbime Profesionale",
      subcategories: [
        { value: "professional-legal", label: "Juridik" },
        { value: "professional-accounting", label: "Kontabilitet" },
        { value: "professional-translation", label: "Përkthim" },
        { value: "professional-consulting", label: "Konsulencë" },
      ],
    },
    {
      value: "transport",
      label: "Transport & Lëvizje",
      subcategories: [
        { value: "transport-moving", label: "Shpërngulje" },
        { value: "transport-delivery", label: "Dërgesa" },
        { value: "transport-taxi", label: "Transport" },
      ],
    },
    { value: "other-services", label: "Tjetër" },
  ],
  jobs: [
    {
      value: "jobs",
      label: "Punë / Employment",
      subcategories: [
        { value: "jobs-tech", label: "IT & Teknologji" },
        { value: "jobs-sales", label: "Shitje & Marketing" },
        { value: "jobs-hospitality", label: "Hoteleri & Turizëm" },
        { value: "jobs-construction", label: "Ndërtim" },
        { value: "jobs-education", label: "Edukim" },
        { value: "jobs-healthcare", label: "Shëndetësi" },
        { value: "jobs-admin", label: "Administratë & Zyrë" },
        { value: "jobs-other", label: "Tjetër" },
      ],
    },
  ],
};

export const JOB_TYPES = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "freelance", label: "Freelance" },
  { value: "temporary", label: "Temporary" },
];

export const EXPERIENCE_LEVELS = [
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "any", label: "Any" },
];

export const CONDITIONS = [
  { value: "new", label: "I Ri" },
  { value: "like-new", label: "Si i Ri" },
  { value: "good", label: "Gjendje e Mirë" },
  { value: "used", label: "I Përdorur" },
  { value: "for-parts", label: "Për Pjesë" },
];

export const PRICE_PERIODS = [
  { value: "per-day", label: "Për ditë" },
  { value: "per-week", label: "Për javë" },
  { value: "per-month", label: "Për muaj" },
];

export const CONTACT_METHODS = [
  { value: "chat", label: "Chat" },
  { value: "phone", label: "Telefon" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "viber", label: "Viber" },
];
