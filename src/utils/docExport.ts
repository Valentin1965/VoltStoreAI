/**
 * docExport.ts
 * Generates Word (.docx) documents in the browser and saves them.
 * Uses the docx + file-saver libraries.
 */

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak, LevelFormat,
  ImageRun
} from 'docx';
import { saveAs } from 'file-saver';

// ─── helpers ──────────────────────────────────────────────────────────────────

const BRAND_COLOR   = '16a34a'; // emerald-600
const DARK_COLOR    = '0f172a'; // slate-900
const LIGHT_BG      = 'f0fdf4'; // emerald-50
const BORDER_COLOR  = 'd1fae5';
const GRAY_TEXT     = '64748b'; // slate-500

const border = { style: BorderStyle.SINGLE, size: 1, color: 'e2e8f0' };
const borders = { top: border, bottom: border, left: border, right: border };

const h1 = (text: string): Paragraph =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, bold: true, size: 36, color: DARK_COLOR, font: 'Arial' })],
    spacing: { before: 320, after: 160 },
  });

const h2 = (text: string): Paragraph =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, bold: true, size: 26, color: BRAND_COLOR, font: 'Arial' })],
    spacing: { before: 240, after: 120 },
  });

const body = (text: string, opts?: { bold?: boolean; color?: string; size?: number }): Paragraph =>
  new Paragraph({
    children: [new TextRun({
      text,
      font: 'Arial',
      size: opts?.size ?? 22,
      bold: opts?.bold,
      color: opts?.color ?? GRAY_TEXT,
    })],
    spacing: { after: 80 },
  });

const spacer = () => new Paragraph({ children: [], spacing: { after: 160 } });

const divider = () =>
  new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR } },
    spacing: { after: 200 },
    children: [],
  });

const headerFooterContent = (title: string) => ({
  default: new Header({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: 'Green Light Scandinavia', bold: true, color: BRAND_COLOR, font: 'Arial', size: 18 }),
          new TextRun({ text: `  |  ${title}`, color: GRAY_TEXT, font: 'Arial', size: 18 }),
        ],
        border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: BORDER_COLOR } },
        spacing: { after: 120 },
      }),
    ],
  }),
  footer: new Footer({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: 'www.glsolargroup.dk  |  Green Light Scandinavia  |  Page ', color: GRAY_TEXT, font: 'Arial', size: 16 }),
          new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16, color: GRAY_TEXT }),
        ],
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 2, color: BORDER_COLOR } },
        spacing: { before: 80 },
      }),
    ],
  }),
});

/** 2-col table row */
const row2 = (label: string, value: string, shaded = false) =>
  new TableRow({
    children: [
      new TableCell({
        width: { size: 3600, type: WidthType.DXA },
        borders,
        shading: shaded ? { fill: LIGHT_BG, type: ShadingType.CLEAR } : undefined,
        margins: { top: 80, bottom: 80, left: 140, right: 140 },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 18, font: 'Arial', color: DARK_COLOR })] })],
      }),
      new TableCell({
        width: { size: 5760, type: WidthType.DXA },
        borders,
        shading: shaded ? { fill: LIGHT_BG, type: ShadingType.CLEAR } : undefined,
        margins: { top: 80, bottom: 80, left: 140, right: 140 },
        children: [new Paragraph({ children: [new TextRun({ text: value || '—', size: 18, font: 'Arial', color: GRAY_TEXT })] })],
      }),
    ],
  });

const specTable = (specs: { label: string; value: string }[]) =>
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3600, 5760],
    rows: specs.map((s, i) => row2(s.label, s.value, i % 2 === 0)),
  });

/** Extract technical specs from typed DB fields */
export function buildSpecsFromProduct(p: any): { label: string; value: string }[] {
  const add = (label: string, val: any, unit = '') =>
    val !== undefined && val !== null && val !== ''
      ? [{ label, value: `${val}${unit}` }]
      : [];

  const cat = (p.category || '').toLowerCase();

  if (cat.includes('batteri')) return [
    ...add('Brand',         p.BrandProd),
    ...add('Model',         p.ModelName),
    ...add('Chemistry',     p.BattChem),
    ...add('Type',          p.BattType),
    ...add('Capacity',      p.CapKwh,      ' kWh'),
    ...add('Voltage',       p.NomVoltV,    ' V'),
    ...add('Cycle Life',    p.CycleLife),
    ...add('Max Current',   p.MaxChgDchgCur_A, ' A'),
    ...add('Scalable',      p.Scalab),
    ...add('Temp Range',    p.OpTempC),
    ...add('BMS',           p.BmsInt),
    ...add('Certifications',p.BattCert),
    ...add('Dimensions',    p.DimsMm,      ' mm'),
    ...add('Weight',        p.WgtKg,       ' kg'),
  ];

  if (cat.includes('inverter') || cat.includes('invertere')) return [
    ...add('Brand',         p.BrandProd),
    ...add('Model',         p.ModelName),
    ...add('Type',          p.InvType),
    ...add('Phases',        p.Phases),
    ...add('Max Efficiency',p.MaxEffPerc,  ' %'),
    ...add('MPPTs',         p.NumMppts),
    ...add('MPPT Range',    p.MpptVoltRangeV, ' V'),
    ...add('Max PV Voltage',p.MaxPvInVoltV,   ' V'),
    ...add('Protocol',      p.CommProt),
    ...add('Protection',    p.IntProt),
    ...add('IP Rating',     p.IpRating),
  ];

  if (cat.includes('solar') || cat.includes('panel')) return [
    ...add('Brand',         p.BrandProd),
    ...add('Model',         p.ModelName),
    ...add('Panel Type',    p.SolarPanelType),
    ...add('Cell Technology',p.CellTech),
    ...add('Rated Power',   p.RatedPwrWp,  ' Wp'),
    ...add('Efficiency',    p.ModEffPerc,  ' %'),
    ...add('Temp Coeff.',   p.TempCoeffPmax),
    ...add('Glass Type',    p.GlassType),
    ...add('Product Warranty', p.ProdWarrYrs, ' years'),
    ...add('Performance Warranty', p.PerfWarrYrs, ' years'),
  ];

  if (cat.includes('varmepumpe') || cat.includes('heat')) return [
    ...add('Brand',         p.BrandProd),
    ...add('Model',         p.ModelName),
    ...add('Type',          p.HpType),
    ...add('Phases',        p.Phases1),
    ...add('Refrigerant',   p.RefrType),
    ...add('Heat Capacity', p.HeatCapKw,   ' kW'),
    ...add('SCOP 35°C',    p.Scop35C),
    ...add('Max Flow Temp.',p.MaxFlowTempC,' °C'),
    ...add('Sound Power',   p.SndPwrDba,   ' dBA'),
  ];

  if (cat.includes('ev') || cat.includes('charger') || cat.includes('power')) return [
    ...add('Brand',         p.BrandProd),
    ...add('Model',         p.ModelName),
    ...add('Charging Power',p.ChgPwrKw,   ' kW'),
    ...add('Connector',     p.ConnType),
    ...add('Authentication',p.AuthMeth),
    ...add('OCPP Version',  p.OcppVer),
    ...add('Dynamic Load',  p.DynLoadMng),
    ...add('V2G Support',   p.V2gSupp),
    ...add('Protection',    p.ChgProtRcd),
    ...add('MID Meter',     p.MidMet),
  ];

  // Fallback — generic specs array
  return Array.isArray(p.specs)
    ? p.specs.map((s: any) => ({ label: s.label || '', value: String(s.value || '') }))
    : [];
}

// ─── Price formatting ──────────────────────────────────────────────────────────

const fmtPrice = (eur: number) =>
  `€${eur.toLocaleString('da-DK', { minimumFractionDigits: 0 })} excl. VAT   |   €${(eur * 1.25).toLocaleString('da-DK', { minimumFractionDigits: 0 })} incl. VAT`;

// ─── 1. Single Product ────────────────────────────────────────────────────────

export interface ProductExportData {
  id: string;
  name: string;
  category: string;
  manufacturer?: string;
  description?: string;
  price: number;
  stock: number;
  specs?: { label: string; value: string }[];
  features?: string[];
  // DB typed fields (passed as-is for buildSpecsFromProduct)
  [key: string]: any;
}

export async function exportProductDocx(product: ProductExportData): Promise<void> {
  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Arial', size: 22, color: GRAY_TEXT } },
      },
    },
    sections: [{
      ...headerFooterContent(`Product: ${product.name}`),
      properties: {
        page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } },
      },
      children: [
        // Title block
        new Paragraph({
          children: [new TextRun({ text: product.name.toUpperCase(), bold: true, size: 52, color: DARK_COLOR, font: 'Arial' })],
          spacing: { after: 160 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: product.category, bold: true, size: 20, color: BRAND_COLOR, font: 'Arial' }),
            product.manufacturer
              ? new TextRun({ text: `  ·  ${product.manufacturer}`, size: 20, color: GRAY_TEXT, font: 'Arial' })
              : new TextRun({ text: '' }),
          ],
          spacing: { after: 80 },
        }),
        divider(),

        // Price
        h2('Price'),
        new Paragraph({
          children: [new TextRun({ text: fmtPrice(product.price), bold: true, size: 28, color: DARK_COLOR, font: 'Arial' })],
          spacing: { after: 80 },
        }),
        body(`In stock: ${product.stock} units`),
        spacer(),

        // Description
        ...(product.description ? [
          h2('Description'),
          body(product.description, { color: GRAY_TEXT }),
          spacer(),
        ] : []),

        // Features
        ...(product.features && product.features.length > 0 ? [
          h2('Key Features'),
          ...product.features.map(f =>
            new Paragraph({
              numbering: { reference: 'bullets', level: 0 },
              children: [new TextRun({ text: f, size: 22, font: 'Arial', color: GRAY_TEXT })],
            })
          ),
          spacer(),
        ] : []),

        // Specs table
        ...((() => {
          const allSpecs = buildSpecsFromProduct(product);
          return allSpecs.length > 0 ? [
            h2('Technical Specifications'),
            specTable(allSpecs),
            spacer(),
          ] : [];
        })()),

        divider(),
        body(`Document generated: ${new Date().toLocaleDateString('da-DK')}  |  Green Light Scandinavia  |  www.glsolargroup.dk`, { size: 18 }),
      ],
    }],
    numbering: {
      config: [{
        reference: 'bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '•',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      }],
    },
  });

  const buffer = await Packer.toBlob(doc);
  saveAs(buffer, `GL_${product.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}.docx`);
}

// ─── 2. Calculator Kit ────────────────────────────────────────────────────────

export interface KitExportData {
  title: string;
  description: string;
  totalPrice: number;
  components: {
    name: string;
    quantity: number;
    price: number;
    type: string;
  }[];
  benefits: string[];
  params: {
    consumption: string;
    phase: string;
    goal: string;
    budget: string;
  };
}

export async function exportKitDocx(kit: KitExportData): Promise<void> {
  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 22, color: GRAY_TEXT } } },
    },
    sections: [{
      ...headerFooterContent('Solar System Configuration'),
      properties: {
        page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } },
      },
      children: [
        new Paragraph({
          children: [new TextRun({ text: kit.title.toUpperCase(), bold: true, size: 48, color: DARK_COLOR, font: 'Arial' })],
          spacing: { after: 160 },
        }),
        body(kit.description),
        divider(),

        // Parameters
        h2('System Parameters'),
        specTable([
          { label: 'Monthly Consumption', value: `${kit.params.consumption} kWh` },
          { label: 'Phase',               value: `${kit.params.phase}-Phase` },
          { label: 'Goal',                value: kit.params.goal },
          { label: 'Budget Tier',         value: kit.params.budget },
        ]),
        spacer(),

        // Components
        h2('System Components'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [4200, 1800, 1680, 1680],
          rows: [
            // header
            new TableRow({
              children: ['Component', 'Qty', 'Unit Price', 'Total'].map((t, i) =>
                new TableCell({
                  width: { size: [4200,1800,1680,1680][i], type: WidthType.DXA },
                  borders,
                  shading: { fill: DARK_COLOR, type: ShadingType.CLEAR },
                  margins: { top: 100, bottom: 100, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, size: 20, font: 'Arial', color: 'FFFFFF' })] })],
                })
              ),
            }),
            // rows
            ...kit.components.map((c, i) =>
              new TableRow({
                children: [
                  c.name,
                  String(c.quantity),
                  `€${c.price.toLocaleString('da-DK')}`,
                  `€${(c.price * c.quantity).toLocaleString('da-DK')}`,
                ].map((val, ci) =>
                  new TableCell({
                    width: { size: [4200,1800,1680,1680][ci], type: WidthType.DXA },
                    borders,
                    shading: i % 2 === 0 ? { fill: LIGHT_BG, type: ShadingType.CLEAR } : undefined,
                    margins: { top: 80, bottom: 80, left: 120, right: 120 },
                    children: [new Paragraph({ children: [new TextRun({ text: val, size: 20, font: 'Arial', color: GRAY_TEXT })] })],
                  })
                ),
              })
            ),
            // total row
            new TableRow({
              children: [
                new TableCell({
                  columnSpan: 3,
                  width: { size: 7680, type: WidthType.DXA },
                  borders,
                  shading: { fill: BRAND_COLOR, type: ShadingType.CLEAR },
                  margins: { top: 100, bottom: 100, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun({ text: 'TOTAL (excl. VAT)', bold: true, size: 22, font: 'Arial', color: 'FFFFFF' })] })],
                }),
                new TableCell({
                  width: { size: 1680, type: WidthType.DXA },
                  borders,
                  shading: { fill: BRAND_COLOR, type: ShadingType.CLEAR },
                  margins: { top: 100, bottom: 100, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun({ text: `€${kit.totalPrice.toLocaleString('da-DK')}`, bold: true, size: 22, font: 'Arial', color: 'FFFFFF' })] })],
                }),
              ],
            }),
          ],
        }),
        spacer(),
        body(`Incl. VAT (25%): €${(kit.totalPrice * 1.25).toLocaleString('da-DK')}`, { bold: true, color: DARK_COLOR }),
        spacer(),

        // Benefits
        h2('System Benefits'),
        ...kit.benefits.map(b =>
          new Paragraph({
            numbering: { reference: 'bullets', level: 0 },
            children: [new TextRun({ text: b, size: 22, font: 'Arial', color: GRAY_TEXT })],
          })
        ),
        spacer(),
        divider(),
        body(`Document generated: ${new Date().toLocaleDateString('da-DK')}  |  Green Light Scandinavia`, { size: 18 }),
      ],
    }],
    numbering: {
      config: [{
        reference: 'bullets',
        levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
      }],
    },
  });

  const buffer = await Packer.toBlob(doc);
  saveAs(buffer, `GL_Kit_${kit.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}.docx`);
}

// ─── 3. Cart / Quote ─────────────────────────────────────────────────────────

export interface CartExportItem {
  name: string;
  category: string;
  quantity: number;
  price: number;
  parts?: { name: string; quantity: number; price: number }[];
  // Raw DB fields for specs
  [key: string]: any;
}

export async function exportCartDocx(items: CartExportItem[], customerName?: string): Promise<void> {
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const date  = new Date().toLocaleDateString('da-DK');
  const qNum  = `GL-${Date.now().toString().slice(-6)}`;

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 22, color: GRAY_TEXT } } },
    },
    sections: [{
      ...headerFooterContent(`Quotation ${qNum}`),
      properties: {
        page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } },
      },
      children: [
        // Title
        new Paragraph({
          children: [new TextRun({ text: 'QUOTATION', bold: true, size: 60, color: DARK_COLOR, font: 'Arial' })],
          spacing: { after: 80 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `#${qNum}  ·  ${date}`, size: 20, color: GRAY_TEXT, font: 'Arial' })],
          spacing: { after: 80 },
        }),
        ...(customerName ? [body(`Prepared for: ${customerName}`, { bold: true, color: DARK_COLOR })] : []),
        body('Green Light Scandinavia  |  www.glsolargroup.dk'),
        divider(),

        // Items table
        h2('Order Items'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [4360, 1400, 1800, 1800],
          rows: [
            // header
            new TableRow({
              children: ['Product', 'Qty', 'Unit Price', 'Total'].map((t, i) =>
                new TableCell({
                  width: { size: [4360,1400,1800,1800][i], type: WidthType.DXA },
                  borders,
                  shading: { fill: DARK_COLOR, type: ShadingType.CLEAR },
                  margins: { top: 100, bottom: 100, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, size: 20, font: 'Arial', color: 'FFFFFF' })] })],
                })
              ),
            }),
            // items
            ...items.flatMap((item, i) => {
              const mainRow = new TableRow({
                children: [
                  item.name,
                  String(item.quantity),
                  `€${item.price.toLocaleString('da-DK')}`,
                  `€${(item.price * item.quantity).toLocaleString('da-DK')}`,
                ].map((val, ci) =>
                  new TableCell({
                    width: { size: [4360,1400,1800,1800][ci], type: WidthType.DXA },
                    borders,
                    shading: i % 2 === 0 ? { fill: LIGHT_BG, type: ShadingType.CLEAR } : undefined,
                    margins: { top: 80, bottom: 80, left: 120, right: 120 },
                    children: [new Paragraph({ children: [new TextRun({ text: val, size: 20, font: 'Arial', color: ci === 0 ? DARK_COLOR : GRAY_TEXT, bold: ci === 0 })] })],
                  })
                ),
              });
              // kit parts sub-rows
              const partRows = (item.parts || []).map(p =>
                new TableRow({
                  children: [
                    `  ↳ ${p.name}`,
                    String(p.quantity),
                    `€${p.price.toLocaleString('da-DK')}`,
                    `€${(p.price * p.quantity).toLocaleString('da-DK')}`,
                  ].map((val, ci) =>
                    new TableCell({
                      width: { size: [4360,1400,1800,1800][ci], type: WidthType.DXA },
                      borders,
                      margins: { top: 60, bottom: 60, left: 120, right: 120 },
                      children: [new Paragraph({ children: [new TextRun({ text: val, size: 18, font: 'Arial', color: GRAY_TEXT, italics: true })] })],
                    })
                  ),
                })
              );
              return [mainRow, ...partRows];
            }),
            // totals
            new TableRow({
              children: [
                new TableCell({ columnSpan: 3, width: { size: 7560, type: WidthType.DXA }, borders, shading: { fill: 'f8fafc', type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: 'SUBTOTAL (excl. VAT)', bold: true, size: 22, font: 'Arial', color: DARK_COLOR })] })] }),
                new TableCell({ width: { size: 1800, type: WidthType.DXA }, borders, shading: { fill: 'f8fafc', type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: `€${total.toLocaleString('da-DK')}`, bold: true, size: 22, font: 'Arial', color: DARK_COLOR })] })] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ columnSpan: 3, width: { size: 7560, type: WidthType.DXA }, borders, shading: { fill: BRAND_COLOR, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: 'TOTAL (incl. 25% VAT)', bold: true, size: 24, font: 'Arial', color: 'FFFFFF' })] })] }),
                new TableCell({ width: { size: 1800, type: WidthType.DXA }, borders, shading: { fill: BRAND_COLOR, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: `€${(total * 1.25).toLocaleString('da-DK')}`, bold: true, size: 24, font: 'Arial', color: 'FFFFFF' })] })] }),
              ],
            }),
          ],
        }),
        spacer(),
        spacer(),

        // Technical specs per item
        ...items.flatMap(item => {
          const specs = buildSpecsFromProduct(item);
          if (specs.length === 0) return [];
          return [
            h2(item.name),
            specTable(specs),
            spacer(),
          ];
        }),

        // Terms
        h2('Terms & Conditions'),
        body('• This quotation is valid for 30 days from the date of issue.'),
        body('• Prices are in EUR and subject to change without notice.'),
        body('• Delivery times may vary depending on product availability.'),
        body('• For questions contact: sales@glsolargroup.dk'),
        spacer(),
        divider(),
        body(`Green Light Scandinavia  |  ${date}  |  www.glsolargroup.dk`, { size: 18 }),
      ],
    }],
    numbering: {
      config: [{
        reference: 'bullets',
        levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
      }],
    },
  });

  const buffer = await Packer.toBlob(doc);
  saveAs(buffer, `GL_Quote_${qNum}.docx`);
}
