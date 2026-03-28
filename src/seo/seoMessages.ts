import type { Language } from '../contexts/LanguageContext';

export type SeoPageKey =
  | 'about'
  | 'catalog'
  | 'catalog_section'
  | 'contact'
  | 'calculator'
  | 'service'
  | 'cart'
  | 'checkout'
  | 'private';

/** Localized SEO titles & descriptions (plain text — no HTML). */
const SEO: Record<Language, Record<SeoPageKey, { title: string; description: string }>> = {
  da: {
    about: {
      title: 'Green Light Scandinavia | Solceller & energiløsninger',
      description:
        'Professionelle solcelleanlæg, varmepumper og energioptimering til private og erhverv i Danmark, Sverige og Norge.',
    },
    catalog: {
      title: 'Katalog | Green Light Scandinavia',
      description:
        'Browse invertere, batterier, solpaneler, sæt og tilbehør — professionelt udstyr til solenergi og lagring.',
    },
    catalog_section: {
      title: '{{section}} | Katalog | Green Light Scandinavia',
      description: '{{section}} — udvalg af professionelt udstyr fra Green Light Scandinavia.',
    },
    contact: {
      title: 'Kontakt | Green Light Scandinavia',
      description:
        'Kontakt Green Light Scandinavia for tilbud, rådgivning og service omkring solceller og energiløsninger.',
    },
    calculator: {
      title: 'Energiberegner | Green Light Scandinavia',
      description:
        'Beregn behov for inverter, batteri og solceller ud fra dit elforbrug.',
    },
    service: {
      title: 'Installation & service | Green Light Scandinavia',
      description:
        'Professionel montering og service af solcelleanlæg og energisystemer.',
    },
    cart: {
      title: 'Kurv | Green Light Scandinavia',
      description: 'Gennemse din kurv og fortsæt til bestilling.',
    },
    checkout: {
      title: 'Kasse | Green Light Scandinavia',
      description: 'Gennemfør din ordre.',
    },
    private: {
      title: 'Green Light Scandinavia',
      description: 'Green Light Scandinavia — energiløsninger.',
    },
  },
  no: {
    about: {
      title: 'Green Light Scandinavia | Solenergi & energiløsninger',
      description:
        'Profesjonelle solcelleanlegg, varmepumper og energioptimalisering for privat og næringsliv i Skandinavia.',
    },
    catalog: {
      title: 'Katalog | Green Light Scandinavia',
      description:
        'Se vekselrettere, batterier, solpaneler, sett og tilbehør — profesjonelt utstyr for solenergi.',
    },
    catalog_section: {
      title: '{{section}} | Katalog | Green Light Scandinavia',
      description: '{{section}} — utvalg av profesjonelt utstyr fra Green Light Scandinavia.',
    },
    contact: {
      title: 'Kontakt | Green Light Scandinavia',
      description:
        'Ta kontakt med Green Light Scandinavia for tilbud og rådgivning om solenergi.',
    },
    calculator: {
      title: 'Energikalkulator | Green Light Scandinavia',
      description:
        'Beregn behov for inverter, batteri og solceller ut fra strømforbruket ditt.',
    },
    service: {
      title: 'Installasjon & service | Green Light Scandinavia',
      description:
        'Profesjonell montering og service av solcelleanlegg og energisystemer.',
    },
    cart: {
      title: 'Handlekurv | Green Light Scandinavia',
      description: 'Se over handlekurven og fortsett til bestilling.',
    },
    checkout: {
      title: 'Kasse | Green Light Scandinavia',
      description: 'Fullfør bestillingen.',
    },
    private: {
      title: 'Green Light Scandinavia',
      description: 'Green Light Scandinavia — energiløsninger.',
    },
  },
  se: {
    about: {
      title: 'Green Light Scandinavia | Solenergi & energilösningar',
      description:
        'Professionella solcellsanläggningar, värmepumpar och energioptimering för privat och företag i Skandinavien.',
    },
    catalog: {
      title: 'Katalog | Green Light Scandinavia',
      description:
        'Växelriktare, batterier, solpaneler, kit och tillbehör — professionell utrustning för solenergi.',
    },
    catalog_section: {
      title: '{{section}} | Katalog | Green Light Scandinavia',
      description: '{{section}} — urval av professionell utrustning från Green Light Scandinavia.',
    },
    contact: {
      title: 'Kontakt | Green Light Scandinavia',
      description:
        'Kontakta Green Light Scandinavia för offert och rådgivning om solenergi.',
    },
    calculator: {
      title: 'Energikalkylator | Green Light Scandinavia',
      description:
        'Beräkna behov av växelriktare, batteri och solceller utifrån din elförbrukning.',
    },
    service: {
      title: 'Installation & service | Green Light Scandinavia',
      description:
        'Professionell montering och service av solcellsanläggningar och energisystem.',
    },
    cart: {
      title: 'Varukorg | Green Light Scandinavia',
      description: 'Granska varukorgen och fortsätt till beställning.',
    },
    checkout: {
      title: 'Kassa | Green Light Scandinavia',
      description: 'Slutför din beställning.',
    },
    private: {
      title: 'Green Light Scandinavia',
      description: 'Green Light Scandinavia — energilösningar.',
    },
  },
  en: {
    about: {
      title: 'Green Light Scandinavia | Solar & energy solutions',
      description:
        'Professional solar PV, heat pumps and energy optimization for homes and businesses in Scandinavia.',
    },
    catalog: {
      title: 'Catalog | Green Light Scandinavia',
      description:
        'Browse inverters, batteries, solar panels, kits and accessories — professional solar and storage equipment.',
    },
    catalog_section: {
      title: '{{section}} | Catalog | Green Light Scandinavia',
      description: '{{section}} — professional equipment from Green Light Scandinavia.',
    },
    contact: {
      title: 'Contact | Green Light Scandinavia',
      description:
        'Contact Green Light Scandinavia for quotes and advice on solar and energy systems.',
    },
    calculator: {
      title: 'Energy calculator | Green Light Scandinavia',
      description:
        'Estimate inverter, battery and panel needs from your electricity consumption.',
    },
    service: {
      title: 'Installation & service | Green Light Scandinavia',
      description:
        'Professional installation and servicing of solar and energy systems.',
    },
    cart: {
      title: 'Cart | Green Light Scandinavia',
      description: 'Review your cart and continue to checkout.',
    },
    checkout: {
      title: 'Checkout | Green Light Scandinavia',
      description: 'Complete your order.',
    },
    private: {
      title: 'Green Light Scandinavia',
      description: 'Green Light Scandinavia — energy solutions.',
    },
  },
};

/** Catalog slug → localized section label for titles (UI language). */
export const CATALOG_SLUG_LABEL: Record<string, Record<Language, string>> = {
  inverters: {
    da: 'Invertere',
    no: 'Vekselrettere',
    se: 'Växelriktare',
    en: 'Inverters',
  },
  batteries: {
    da: 'Batterier',
    no: 'Batterier',
    se: 'Batterier',
    en: 'Batteries',
  },
  'solar-panels': {
    da: 'Solpaneler',
    no: 'Solpaneler',
    se: 'Solpaneler',
    en: 'Solar panels',
  },
  kits: {
    da: 'Sæt',
    no: 'Sett',
    se: 'Paket',
    en: 'Kits',
  },
  'heat-pumps': {
    da: 'Varmepumper',
    no: 'Varmepumper',
    se: 'Värmepumpar',
    en: 'Heat pumps',
  },
  'power-station': {
    da: 'Power Station',
    no: 'Power Station',
    se: 'Power Station',
    en: 'Power stations',
  },
  mounting: {
    da: 'Monteringssystemer',
    no: 'Monteringssystemer',
    se: 'Monteringssystem',
    en: 'Mounting systems',
  },
};

export function getSeoStrings(
  language: Language,
  key: SeoPageKey,
  sectionLabel?: string,
): { title: string; description: string } {
  const row = SEO[language][key];
  if (key !== 'catalog_section' || !sectionLabel) {
    return { ...row };
  }
  return {
    title: row.title.replace(/\{\{section\}\}/g, sectionLabel),
    description: row.description.replace(/\{\{section\}\}/g, sectionLabel),
  };
}

export function sectionLabelForCatalogSlug(slug: string, language: Language): string {
  return CATALOG_SLUG_LABEL[slug]?.[language] ?? slug.replace(/-/g, ' ');
}
