// Shared lists used by forms, filters, matching and SEO pages (safe on client and server).

export const PROCESSES = [
	{ id: 'CNC_MACHINING', label: 'CNC Machining (VMC / HMC)' },
	{ id: 'CNC_TURNING', label: 'CNC Turning / Lathe' },
	{ id: 'SHEET_METAL', label: 'Sheet Metal Fabrication' },
	{ id: 'PRESS_STAMPING', label: 'Press / Stamping' },
	{ id: 'LASER_CUTTING', label: 'Laser / Plasma Cutting' },
	{ id: 'DIE_CASTING', label: 'Pressure Die Casting' },
	{ id: 'SAND_CASTING', label: 'Sand / Gravity Casting' },
	{ id: 'INVESTMENT_CASTING', label: 'Investment Casting' },
	{ id: 'FORGING', label: 'Forging' },
	{ id: 'INJECTION_MOULDING', label: 'Plastic Injection Moulding' },
	{ id: 'RUBBER_MOULDING', label: 'Rubber Moulding' },
	{ id: 'TOOL_DIE', label: 'Tool, Die & Mould Making' },
	{ id: 'WELDING_FABRICATION', label: 'Welding & Structural Fabrication' },
	{ id: 'GEAR_MANUFACTURING', label: 'Gear Manufacturing' },
	{ id: 'GRINDING', label: 'Grinding / Honing' },
	{ id: 'HEAT_TREATMENT', label: 'Heat Treatment' },
	{ id: 'SURFACE_TREATMENT', label: 'Plating / Anodizing / Powder Coating' },
	{ id: '3D_PRINTING', label: '3D Printing / Rapid Prototyping' },
	{ id: 'ASSEMBLY', label: 'Assembly & Sub-assembly' },
	{ id: 'INSPECTION_TESTING', label: 'Inspection & Testing (CMM / NDT)' },
	{ id: 'PCB_ELECTRONICS', label: 'PCB / Electronics Assembly' }
] as const;

export const PROCESS_LABEL: Record<string, string> = Object.fromEntries(
	PROCESSES.map((p) => [p.id, p.label])
);

// ---- Common categories shared by the RFQ form, seller profiles and the shop filter ----
// Buyers and sellers are tagged with the SAME ids, so filtering/ranking compares like with like.

/** Commodity category → the processes it contains (drives the dependent Process list). */
export const COMMODITY_CATEGORIES = [
	{ id: 'METAL_CUTTING', label: 'Metal cutting (CNC machining, turning, laser)', processes: ['CNC_MACHINING', 'CNC_TURNING', 'LASER_CUTTING', 'GRINDING', 'GEAR_MANUFACTURING'] },
	{ id: 'METAL_FORMING', label: 'Metal forming (sheet metal, forging, bending)', processes: ['SHEET_METAL', 'PRESS_STAMPING', 'FORGING'] },
	{ id: 'CASTING', label: 'Casting (sand, die, investment)', processes: ['SAND_CASTING', 'DIE_CASTING', 'INVESTMENT_CASTING'] },
	{ id: 'MOLDING', label: 'Molding (injection, blow, RTM)', processes: ['INJECTION_MOULDING', 'RUBBER_MOULDING'] },
	{ id: 'TREATMENT', label: 'Treatment (heat, surface)', processes: ['HEAT_TREATMENT', 'SURFACE_TREATMENT'] },
	{ id: 'ASSEMBLY_FABRICATION', label: 'Assembly / fabrication', processes: ['WELDING_FABRICATION', 'ASSEMBLY', 'PCB_ELECTRONICS', 'INSPECTION_TESTING'] },
	{ id: 'TOOLING', label: 'Tooling (dies, moulds, fixtures)', processes: ['TOOL_DIE'] },
	{ id: 'ADDITIVE', label: 'Additive / rapid prototyping (3D printing)', processes: ['3D_PRINTING'] }
] as const;

export function processesForCommodity(id: string): string[] {
	return [...(COMMODITY_CATEGORIES.find((c) => c.id === id)?.processes ?? [])];
}

/** Material family → example grades (suggestions for the free-text Material field). */
export const MATERIAL_CATEGORIES = [
	{ id: 'FERROUS', label: 'Ferrous (steel, iron)', examples: ['EN8', 'EN24', 'EN31', 'MS IS2062', 'SS304', 'SS316', 'D2', 'H13', 'SG Iron 500/7', 'Grey Cast Iron FG260'] },
	{ id: 'NON_FERROUS', label: 'Non-ferrous (aluminium, copper, brass)', examples: ['Al6061-T6', 'Al7075', 'ADC12', 'LM6', 'Brass CZ121', 'Copper ETP', 'Phosphor Bronze'] },
	{ id: 'POLYMER', label: 'Polymer / plastic', examples: ['ABS', 'PP', 'Nylon 66', 'POM (Delrin)', 'Polycarbonate', 'PEEK'] },
	{ id: 'RUBBER', label: 'Rubber / elastomer', examples: ['EPDM', 'NBR', 'Silicone', 'Viton (FKM)', 'Neoprene'] },
	{ id: 'COMPOSITE_FIBRE', label: 'Composite — fibre', examples: ['CFRP', 'GFRP', 'Aramid'] },
	{ id: 'COMPOSITE_RESIN', label: 'Composite — resin', examples: ['Epoxy', 'Polyester', 'Vinyl ester'] }
] as const;

export const MATERIAL_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(MATERIAL_CATEGORIES.map((m) => [m.id, m.label]));

export const INDUSTRIES = [
	{ id: 'AGRI_MACHINERY', label: 'Agri Machinery' },
	{ id: 'COMMERCIAL_VEHICLES', label: 'Commercial Vehicles' },
	{ id: 'EV_EMOBILITY', label: 'EV / E-mobility' },
	{ id: 'HEAVY_CASTING', label: 'Heavy Casting' },
	{ id: 'INDUSTRIAL_TECH', label: 'Industrial Tech' },
	{ id: 'DEFENCE', label: 'Defence' },
	{ id: 'OTHER', label: 'Other' }
] as const;

export const INDUSTRY_LABEL: Record<string, string> = Object.fromEntries(INDUSTRIES.map((i) => [i.id, i.label]));

/** Ordered low → high so `rank` can be compared for cost-based filtering later. */
export const BUDGET_RANGES = [
	{ id: 'LT_50K', label: '< ₹50,000', rank: 1 },
	{ id: '50K_2L', label: '₹50,000 – 2 Lakh', rank: 2 },
	{ id: '2L_10L', label: '₹2 – 10 Lakh', rank: 3 },
	{ id: '10L_25L', label: '₹10 – 25 Lakh', rank: 4 },
	{ id: '25L_75L', label: '₹25 – 75 Lakh', rank: 5 },
	{ id: '75L_2CR', label: '₹75 Lakh – 2 Crore', rank: 6 },
	{ id: 'GT_2CR', label: '> ₹2 Crore', rank: 7 },
	{ id: 'NOT_SURE', label: 'Not sure — need an estimate', rank: 0 }
] as const;

export const BUDGET_LABEL: Record<string, string> = Object.fromEntries(BUDGET_RANGES.map((b) => [b.id, b.label]));

export const DELIVERY_TIMELINES = [
	{ id: 'URGENT_1W', label: 'Urgent — within 1 week', days: 7 },
	{ id: '2W', label: 'Within 2 weeks', days: 14 },
	{ id: '1M', label: 'Within 1 month', days: 30 },
	{ id: '1_3M', label: '1 – 3 months', days: 90 },
	{ id: 'FLEXIBLE', label: 'Flexible', days: 365 }
] as const;

export const TIMELINE_LABEL: Record<string, string> = Object.fromEntries(DELIVERY_TIMELINES.map((t) => [t.id, t.label]));

export const ORDER_TYPES = [
	{ id: 'PROTOTYPE', label: 'Prototype / Sample (1–10 pcs)' },
	{ id: 'SMALL_BATCH', label: 'Small batch (10–500 pcs)' },
	{ id: 'PRODUCTION', label: 'Production batch (500+ pcs)' },
	{ id: 'RECURRING', label: 'Recurring monthly supply' }
] as const;

export const ORDER_TYPE_LABEL: Record<string, string> = Object.fromEntries(
	ORDER_TYPES.map((o) => [o.id, o.label])
);

export const INDIAN_STATES = [
	'Andhra Pradesh', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
	'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
	'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh',
	'Uttarakhand', 'West Bengal'
] as const;

export type VerificationStatus =
	| 'DOCS_SUBMITTED'
	| 'DOCS_VERIFIED'
	| 'GROUND_VERIFIED'
	| 'REJECTED';

export const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
	DOCS_SUBMITTED: 'Under review',
	DOCS_VERIFIED: 'Documents verified',
	GROUND_VERIFIED: 'Ground verified',
	REJECTED: 'Rejected'
};

/** Sellers at these levels are listed publicly and receive leads. */
export const LISTED_STATUSES: VerificationStatus[] = ['DOCS_VERIFIED', 'GROUND_VERIFIED'];
