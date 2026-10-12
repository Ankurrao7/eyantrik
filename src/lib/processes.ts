// eYantrik process list: Shop → Group → Process (13 shops, ~140 processes).
// Written for engineers AND non-engineers:
//   • shops use the words Indian buyers use ("machine shop", "press shop", "foundry")
//   • every shop lists example parts, every process has a one-line plain explanation (`hint`)
//   • `aka` = other names people type (VMC, wire cut, CO2 welding…) — used by search
// IDs never change once used: they are stored on sellers and requirements. Rename labels freely.
// Research behind this list: docs/research/manufacturing-network-processes.md

export interface Process {
	id: string;
	label: string;
	hint: string;
	aka?: string[];
}
export interface ProcessGroup {
	label: string;
	processes: Process[];
}
export interface Shop {
	id: string;
	label: string;
	emoji: string;
	/** what this shop does, in plain words */
	plain: string;
	/** parts it typically makes — helps people who don't know process names */
	examples: string;
	groups: ProcessGroup[];
}

export const SHOPS: Shop[] = [
	{
		id: 'MACHINE_SHOP',
		label: 'Machine shop (CNC & lathe)',
		emoji: '⚙️',
		plain: 'Cutting metal bars and blocks into precise parts on lathes and CNC machines.',
		examples: 'Shafts, bushes, pins, flanges, housings, brackets',
		groups: [
			{
				label: 'Turning (round parts)',
				processes: [
					{ id: 'CNC_TURNING', label: 'CNC turning', hint: 'Round parts on a CNC lathe — shafts, bushes, pins', aka: ['lathe', 'CNC lathe', 'turning job work', 'turned parts'] },
					{ id: 'SWISS_TURNING', label: 'Sliding-head (Swiss) turning', hint: 'Small, long, very precise round parts in high volume', aka: ['sliding head', 'traub', 'swiss lathe'] },
					{ id: 'MANUAL_TURNING', label: 'Conventional lathe', hint: 'Simple or one-off round parts on a manual lathe', aka: ['manual lathe', 'centre lathe'] },
					{ id: 'VTL_TURNING', label: 'Vertical turning (VTL)', hint: 'Large, heavy round parts — big flanges, wheels, rings', aka: ['VTL', 'vertical lathe', 'VTM'] }
				]
			},
			{
				label: 'Milling (flat faces, pockets, holes)',
				processes: [
					{ id: 'VMC_MILLING', label: 'VMC machining', hint: 'Flat faces, pockets and holes — brackets, plates, housings', aka: ['VMC', 'CNC milling', 'vertical machining centre', 'milling job work'] },
					{ id: 'HMC_MILLING', label: 'HMC machining', hint: 'Several sides of boxy parts in one setup — gearbox and pump housings', aka: ['HMC', 'horizontal machining centre'] },
					{ id: 'FIVE_AXIS', label: '5-axis machining', hint: 'Complex curved parts — impellers, moulds, aerospace parts', aka: ['5 axis', 'simultaneous machining'] },
					{ id: 'MANUAL_MILLING', label: 'Conventional milling', hint: 'Simple milling work on a manual machine', aka: ['manual milling'] }
				]
			},
			{
				label: 'Drilling & boring',
				processes: [
					{ id: 'CNC_DRILLING', label: 'Drilling & tapping', hint: 'Holes and threads in parts', aka: ['tapping', 'drilling', 'radial drilling'] },
					{ id: 'DEEP_HOLE_DRILLING', label: 'Deep-hole / gun drilling', hint: 'Long straight holes — hydraulic cylinders, moulds', aka: ['gun drilling', 'BTA drilling'] },
					{ id: 'BORING', label: 'Boring (horizontal / jig)', hint: 'Large, accurate holes in big parts', aka: ['horizontal boring', 'jig boring', 'HBM'] }
				]
			},
			{
				label: 'Spark & wire cutting (EDM)',
				processes: [
					{ id: 'WIRE_EDM', label: 'Wire cut (wire EDM)', hint: 'Cutting hardened steel with a thin wire — dies, punches', aka: ['wire cut', 'wire EDM', 'WEDM'] },
					{ id: 'SPARK_EDM', label: 'Spark erosion (EDM)', hint: 'Burning shapes into hardened steel — mould cavities', aka: ['EDM', 'die sinking', 'spark erosion'] },
					{ id: 'EDM_DRILLING', label: 'EDM hole drilling', hint: 'Tiny holes in hard metal', aka: ['small hole EDM', 'super drill'] }
				]
			},
			{
				label: 'Gears & special machining',
				processes: [
					{ id: 'GEAR_CUTTING', label: 'Gear cutting (hobbing / shaping)', hint: 'Gears, splines and sprockets', aka: ['gear hobbing', 'gear shaping', 'spline cutting', 'gear manufacturing'] },
					{ id: 'BROACHING', label: 'Broaching & keyway slotting', hint: 'Keyways, internal splines and shaped holes', aka: ['slotting', 'keyway'] },
					{ id: 'HONING', label: 'Honing', hint: 'Ultra-smooth, precise bores — engine and hydraulic cylinders', aka: ['bore finishing'] }
				]
			},
			{
				label: 'Grinding (fine finish)',
				processes: [
					{ id: 'CYL_GRINDING', label: 'Cylindrical grinding', hint: 'Precise, smooth round surfaces', aka: ['OD grinding', 'ID grinding'] },
					{ id: 'CENTRELESS_GRINDING', label: 'Centreless grinding', hint: 'High-volume grinding of pins and rods', aka: ['centerless'] },
					{ id: 'SURFACE_GRINDING', label: 'Surface grinding', hint: 'Very flat, smooth faces', aka: ['flat grinding'] },
					{ id: 'JIG_GRINDING', label: 'Jig grinding', hint: 'Accurate holes in hardened tools' },
					{ id: 'TOOL_GRINDING', label: 'Tool & cutter grinding', hint: 'Making and sharpening cutting tools', aka: ['regrinding', 'tool sharpening'] }
				]
			}
		]
	},
	{
		id: 'CUTTING',
		label: 'Cutting & profiling',
		emoji: '✂️',
		plain: 'Cutting shapes out of metal sheets, plates, bars and tubes.',
		examples: 'Plates, brackets, flanges, gaskets, frame parts',
		groups: [
			{
				label: 'Heat cutting',
				processes: [
					{ id: 'SHEET_LASER', label: 'Laser cutting (sheet / plate)', hint: 'Accurate shapes from sheet and plate', aka: ['laser cutting', 'fibre laser', 'CO2 laser'] },
					{ id: 'TUBE_LASER', label: 'Tube & pipe laser cutting', hint: 'Cutting holes and shapes in tubes and sections', aka: ['pipe laser'] },
					{ id: 'PLASMA_CUTTING', label: 'Plasma cutting', hint: 'Fast cutting of medium-thick steel plate', aka: ['CNC plasma'] },
					{ id: 'GAS_CUTTING', label: 'Gas cutting (oxy-fuel)', hint: 'Cutting very thick steel plates', aka: ['flame cutting', 'oxy-fuel', 'profile cutting'] }
				]
			},
			{
				label: 'Cold cutting',
				processes: [
					{ id: 'WATERJET', label: 'Waterjet cutting', hint: 'Cutting any material without heat — metal, stone, glass, rubber', aka: ['water jet', 'abrasive jet'] },
					{ id: 'TURRET_PUNCHING', label: 'CNC turret punching', hint: 'Many holes and shapes punched in sheets quickly', aka: ['punching', 'NCT', 'turret punch'] },
					{ id: 'CHEMICAL_ETCHING', label: 'Photo / chemical etching', hint: 'Very thin, detailed metal parts — shims, meshes, nameplates', aka: ['etching', 'photo etching'] },
					{ id: 'SAWING', label: 'Bar & section cutting (sawing)', hint: 'Cutting bars, pipes and sections to length', aka: ['bandsaw', 'cut to length'] }
				]
			}
		]
	},
	{
		id: 'SHEET_PRESS',
		label: 'Sheet metal & press shop',
		emoji: '🔩',
		plain: 'Bending, pressing and assembling sheet metal.',
		examples: 'Enclosures, panels, cabinets, brackets, washers, clips',
		groups: [
			{
				label: 'Bending & fabrication',
				processes: [
					{ id: 'PRESS_BRAKE', label: 'Sheet bending (press brake)', hint: 'Bending sheets into angles, channels, boxes', aka: ['bending', 'press brake', 'CNC bending'] },
					{ id: 'SHEET_FABRICATION', label: 'Sheet metal fabrication', hint: 'Complete enclosures, cabinets, panels and covers', aka: ['enclosure', 'panel', 'sheet metal'] },
					{ id: 'PLATE_ROLLING', label: 'Plate rolling', hint: 'Rolling plates into cylinders and cones — tanks, ducts', aka: ['roll bending', 'shell rolling'] },
					{ id: 'ROLL_FORMING', label: 'Roll forming', hint: 'Long profiles — channels, purlins, rails', aka: ['profile rolling'] },
					{ id: 'SPINNING', label: 'Metal spinning', hint: 'Round hollow shapes — domes, cones, lamp shades', aka: ['spinning'] }
				]
			},
			{
				label: 'Press work',
				processes: [
					{ id: 'BLANKING', label: 'Blanking & piercing', hint: 'Flat parts punched out in a power press — washers, plates', aka: ['power press', 'press shop', 'punching', 'stamping'] },
					{ id: 'PROGRESSIVE_STAMPING', label: 'Progressive die stamping', hint: 'High-volume formed parts in one press — clips, terminals, brackets', aka: ['progressive tool', 'stamping'] },
					{ id: 'DEEP_DRAWING', label: 'Deep drawing', hint: 'Cups, cans and shells from flat sheet', aka: ['drawing'] },
					{ id: 'FINE_BLANKING', label: 'Fine blanking', hint: 'Very clean, precise press-cut edges — seat and gear parts' }
				]
			}
		]
	},
	{
		id: 'FORGE_FORM',
		label: 'Forging & forming',
		emoji: '🔨',
		plain: 'Shaping hot or cold metal by force; bending tubes and wire.',
		examples: 'Crankshafts, flanges, bolts, rings, springs, bent pipes',
		groups: [
			{
				label: 'Forging',
				processes: [
					{ id: 'HOT_FORGING', label: 'Closed-die hot forging', hint: 'Strong parts pressed in dies — crankshafts, yokes, levers', aka: ['forging', 'hot forging', 'drop forging'] },
					{ id: 'OPEN_DIE_FORGING', label: 'Open-die forging', hint: 'Large, simple shapes — shafts, blocks, discs', aka: ['hammer forging', 'free forging'] },
					{ id: 'COLD_FORGING', label: 'Cold forging & heading', hint: 'Bolts, screws, rivets and other fasteners', aka: ['cold heading', 'fasteners'] },
					{ id: 'UPSET_FORGING', label: 'Upset forging', hint: 'Heads and bulges on bars — axle ends, valves' },
					{ id: 'RING_ROLLING', label: 'Ring rolling', hint: 'Seamless rings — bearing races, flanges' }
				]
			},
			{
				label: 'Other forming',
				processes: [
					{ id: 'THREAD_ROLLING', label: 'Thread rolling', hint: 'Strong threads formed without cutting' },
					{ id: 'EXTRUSION', label: 'Aluminium extrusion', hint: 'Long profiles — window sections, heat sinks', aka: ['extrusion'] },
					{ id: 'POWDER_METALLURGY', label: 'Powder metallurgy (sintering)', hint: 'Small parts pressed from metal powder — bushes, gears', aka: ['sintering', 'PM parts'] },
					{ id: 'MIM', label: 'Metal injection moulding (MIM)', hint: 'Tiny, complex metal parts in high volume' }
				]
			},
			{
				label: 'Tube & wire',
				processes: [
					{ id: 'TUBE_BENDING', label: 'CNC tube bending', hint: 'Bent tubes and frames — furniture, exhaust, hydraulic lines', aka: ['pipe bending', 'tube bending'] },
					{ id: 'PIPE_BENDING', label: 'Heavy pipe bending', hint: 'Large pipes and sections — induction or cold bending', aka: ['induction bending'] },
					{ id: 'TUBE_END_FORMING', label: 'Tube end forming', hint: 'Flaring, reducing and beading tube ends', aka: ['flaring', 'swaging'] },
					{ id: 'WIRE_SPRING', label: 'Wire & spring forming', hint: 'Springs, wire clips, hooks', aka: ['springs', 'wire forming'] }
				]
			}
		]
	},
	{
		id: 'FOUNDRY',
		label: 'Foundry (casting)',
		emoji: '🫗',
		plain: 'Pouring molten metal into moulds.',
		examples: 'Pump and valve bodies, housings, manifolds, impellers',
		groups: [
			{
				label: 'Sand & wax moulds',
				processes: [
					{ id: 'SAND_CASTING', label: 'Sand casting', hint: 'Large or low-volume parts in iron, steel or aluminium', aka: ['green sand', 'foundry', 'SG iron', 'grey iron', 'CI casting'] },
					{ id: 'SHELL_MOULDING', label: 'Shell moulding', hint: 'Better finish than sand — small to medium parts', aka: ['shell casting'] },
					{ id: 'INVESTMENT_CASTING', label: 'Investment casting (lost wax)', hint: 'Complex, accurate small parts', aka: ['lost wax', 'precision casting'] },
					{ id: 'LOST_FOAM', label: 'Lost foam casting', hint: 'Complex shapes from foam patterns' }
				]
			},
			{
				label: 'Metal moulds (dies)',
				processes: [
					{ id: 'GRAVITY_DIE_CASTING', label: 'Gravity die casting', hint: 'Aluminium parts in metal moulds — medium volume', aka: ['GDC', 'permanent mould'] },
					{ id: 'DIE_CASTING', label: 'Pressure die casting (HPDC)', hint: 'Thin-wall aluminium or zinc parts in high volume', aka: ['PDC', 'HPDC', 'die casting'] },
					{ id: 'LPDC', label: 'Low-pressure die casting', hint: 'Strong aluminium parts — wheels, housings', aka: ['LPDC'] },
					{ id: 'CENTRIFUGAL_CASTING', label: 'Centrifugal casting', hint: 'Pipes, bushes, cylinder liners' }
				]
			}
		]
	},
	{
		id: 'PLASTICS',
		label: 'Plastics, rubber & fibreglass',
		emoji: '🧴',
		plain: 'Moulding parts from plastic, rubber or fibreglass (FRP).',
		examples: 'Covers, caps, knobs, seals, gaskets, bottles, FRP panels',
		groups: [
			{
				label: 'Plastic',
				processes: [
					{ id: 'INJECTION_MOULDING', label: 'Plastic injection moulding', hint: 'Plastic parts in high volume — covers, knobs, housings', aka: ['injection moulding', 'moulding', 'plastic parts'] },
					{ id: 'INSERT_MOULDING', label: 'Insert / 2-shot moulding', hint: 'Plastic over metal inserts, or two materials in one part', aka: ['overmoulding', '2K moulding'] },
					{ id: 'BLOW_MOULDING', label: 'Blow moulding', hint: 'Hollow parts — bottles, cans, ducts' },
					{ id: 'VACUUM_FORMING', label: 'Vacuum forming (thermoforming)', hint: 'Trays, covers and panels from plastic sheet', aka: ['thermoforming'] },
					{ id: 'ROTOMOULDING', label: 'Rotational moulding', hint: 'Large hollow parts — tanks, bins, kiosks', aka: ['roto moulding'] },
					{ id: 'PLASTIC_EXTRUSION', label: 'Plastic extrusion', hint: 'Pipes, profiles and sheets' },
					{ id: 'VACUUM_CASTING', label: 'Vacuum casting (PU)', hint: '10–50 prototype plastic parts from silicone moulds', aka: ['PU casting', 'urethane casting'] }
				]
			},
			{
				label: 'Rubber',
				processes: [
					{ id: 'RUBBER_MOULDING', label: 'Rubber moulding', hint: 'Seals, O-rings, gaskets, bushes', aka: ['rubber parts', 'O-ring'] },
					{ id: 'RUBBER_EXTRUSION', label: 'Rubber extrusion', hint: 'Rubber profiles — door seals, tubes, beading' },
					{ id: 'COMPRESSION_MOULDING', label: 'Compression moulding (Bakelite / SMC)', hint: 'Heat-resistant parts — switches, handles, electrical parts', aka: ['bakelite', 'SMC', 'DMC', 'thermoset'] }
				]
			},
			{
				label: 'Fibreglass & composites',
				processes: [
					{ id: 'FRP_LAYUP', label: 'FRP hand / spray lay-up', hint: 'Fibreglass parts — canopies, tanks, covers', aka: ['FRP', 'GRP', 'fibreglass', 'fiberglass'] },
					{ id: 'RTM_INFUSION', label: 'RTM / vacuum infusion', hint: 'Stronger composite parts with a smooth finish', aka: ['RTM', 'resin infusion', 'carbon fibre'] },
					{ id: 'PULTRUSION', label: 'Pultrusion', hint: 'Long fibreglass profiles — ladder rails, cable trays' }
				]
			}
		]
	},
	{
		id: 'TOOL_ROOM',
		label: 'Tool room (dies, moulds & fixtures)',
		emoji: '🛠️',
		plain: 'Making the tools that factories use to produce parts.',
		examples: 'Press dies, plastic moulds, die-casting dies, jigs, gauges',
		groups: [
			{
				label: 'Tools & dies',
				processes: [
					{ id: 'PRESS_TOOLS', label: 'Press tools & dies', hint: 'Blanking, piercing and progressive dies for press shops', aka: ['press tool', 'die making', 'tool and die'] },
					{ id: 'INJECTION_MOULDS', label: 'Plastic injection moulds', hint: 'Moulds for plastic parts', aka: ['mould making', 'mold making'] },
					{ id: 'DIE_CASTING_DIES', label: 'Die-casting dies', hint: 'Dies for pressure and gravity die casting' },
					{ id: 'FORGING_DIES', label: 'Forging dies', hint: 'Dies for hot and cold forging' },
					{ id: 'JIGS_FIXTURES', label: 'Jigs & fixtures', hint: 'Holding parts during machining, welding or checking', aka: ['fixtures', 'welding fixtures'] },
					{ id: 'GAUGES', label: 'Gauges & checking fixtures', hint: 'Go/no-go gauges and inspection fixtures', aka: ['gauge'] }
				]
			}
		]
	},
	{
		id: 'FABRICATION',
		label: 'Welding & fabrication',
		emoji: '🔥',
		plain: 'Joining metal parts into frames, tanks and structures.',
		examples: 'Frames, chassis, tanks, platforms, railings, sheds',
		groups: [
			{
				label: 'Welding',
				processes: [
					{ id: 'MIG_WELDING', label: 'MIG / MAG welding', hint: 'Everyday steel welding — frames, brackets', aka: ['CO2 welding', 'MIG', 'MAG'] },
					{ id: 'TIG_WELDING', label: 'TIG welding', hint: 'Clean, precise welds — stainless steel, aluminium', aka: ['argon welding', 'TIG'] },
					{ id: 'ARC_WELDING', label: 'Arc / stick welding', hint: 'Site and heavy welding with electrodes', aka: ['MMA', 'arc welding', 'electrode welding'] },
					{ id: 'SAW_WELDING', label: 'Submerged arc welding (SAW)', hint: 'Thick-plate welds — pressure vessels, beams', aka: ['SAW'] },
					{ id: 'SPOT_WELDING', label: 'Spot & projection welding', hint: 'Joining sheets — car bodies, cabinets', aka: ['spot welding', 'resistance welding'] },
					{ id: 'LASER_WELDING', label: 'Laser welding', hint: 'Fine, precise welds with little distortion' },
					{ id: 'ROBOTIC_WELDING', label: 'Robotic welding', hint: 'High-volume, repeatable welds', aka: ['robot welding'] }
				]
			},
			{
				label: 'Joining & structures',
				processes: [
					{ id: 'BRAZING', label: 'Brazing', hint: 'Joining with a filler metal — HVAC, copper and carbide parts', aka: ['silver brazing', 'furnace brazing'] },
					{ id: 'SOLDERING', label: 'Soldering', hint: 'Low-temperature joining — electrical and copper parts' },
					{ id: 'STRUCTURAL_FABRICATION', label: 'Structural fabrication', hint: 'Steel structures, sheds, platforms, frames', aka: ['fabrication', 'structure', 'MS fabrication'] },
					{ id: 'RIVETING', label: 'Riveting & fastening', hint: 'Joining with rivets and bolts' }
				]
			}
		]
	},
	{
		id: 'HEAT_TREAT',
		label: 'Heat treatment',
		emoji: '🌡️',
		plain: 'Heating and cooling parts to make them harder, tougher or stress-free.',
		examples: 'Hardened gears, shafts, springs, dies',
		groups: [
			{
				label: 'Heat treatment',
				processes: [
					{ id: 'HARDENING', label: 'Hardening & tempering', hint: 'Making steel parts hard and tough', aka: ['heat treatment', 'H&T', 'through hardening'] },
					{ id: 'CARBURISING', label: 'Case carburising', hint: 'Hard outer skin, tough core — gears, pins', aka: ['case hardening', 'carburizing'] },
					{ id: 'NITRIDING', label: 'Nitriding / plasma nitriding', hint: 'Hard, wear-resistant surface with very little distortion', aka: ['gas nitriding', 'nitrocarburising'] },
					{ id: 'INDUCTION_HARDENING', label: 'Induction hardening', hint: 'Hardening only selected areas — shafts, gear teeth' },
					{ id: 'ANNEALING', label: 'Annealing & normalising', hint: 'Softening metal before machining or forming', aka: ['normalizing'] },
					{ id: 'STRESS_RELIEVING', label: 'Stress relieving', hint: 'Removing stress after welding or machining' },
					{ id: 'VACUUM_HEAT_TREATMENT', label: 'Vacuum heat treatment', hint: 'Clean, scale-free treatment for tool and die steels', aka: ['vacuum hardening'] },
					{ id: 'SOLUTION_AGEING', label: 'Solution & ageing (aluminium)', hint: 'Strengthening aluminium parts — T6', aka: ['T6'] }
				]
			}
		]
	},
	{
		id: 'FINISHING',
		label: 'Surface finishing & coating',
		emoji: '✨',
		plain: 'Protecting and beautifying the surface — plating, painting, polishing.',
		examples: 'Rust protection, black finish, chrome, powder-coated panels',
		groups: [
			{
				label: 'Plating',
				processes: [
					{ id: 'ZINC_PLATING', label: 'Zinc plating', hint: 'Basic rust protection — silver, yellow or black look', aka: ['zinc', 'electro galvanising', 'Zn plating'] },
					{ id: 'NICKEL_PLATING', label: 'Nickel / electroless nickel', hint: 'Even, corrosion-resistant coating', aka: ['ENP', 'electroless nickel'] },
					{ id: 'HARD_CHROME', label: 'Hard chrome plating', hint: 'Wear-resistant surface — hydraulic rods, rollers', aka: ['hard chrome'] },
					{ id: 'DECORATIVE_CHROME', label: 'Decorative chrome', hint: 'Shiny mirror finish — fittings, handles' },
					{ id: 'OTHER_PLATING', label: 'Copper, tin, silver & other plating', hint: 'For electrical contacts and special needs' }
				]
			},
			{
				label: 'Chemical finishes',
				processes: [
					{ id: 'ANODISING', label: 'Anodising', hint: 'Coloured, protective finish on aluminium', aka: ['anodizing'] },
					{ id: 'HARD_ANODISING', label: 'Hard anodising', hint: 'Very hard, wear-resistant aluminium surface', aka: ['hard anodizing'] },
					{ id: 'PHOSPHATING', label: 'Phosphating', hint: 'Base coat before paint; light rust protection', aka: ['zinc phosphate', 'manganese phosphate'] },
					{ id: 'BLACKENING', label: 'Blackening', hint: 'Black oxide finish on steel', aka: ['black oxide', 'blacodising'] }
				]
			},
			{
				label: 'Paint & coatings',
				processes: [
					{ id: 'POWDER_COATING', label: 'Powder coating', hint: 'Tough painted finish — panels, frames, furniture', aka: ['powder coat'] },
					{ id: 'WET_PAINTING', label: 'Liquid / spray painting', hint: 'Painting with liquid paint', aka: ['spray painting', 'PU painting'] },
					{ id: 'CED_COATING', label: 'CED / e-coating', hint: 'Even dip paint for rust protection — automotive parts', aka: ['ED coating', 'KTL', 'cathodic electrodeposition'] },
					{ id: 'GALVANISING', label: 'Hot-dip galvanising', hint: 'Thick zinc for outdoor steel — structures, poles', aka: ['HDG', 'galvanizing'] },
					{ id: 'THERMAL_SPRAY', label: 'Thermal spray coating', hint: 'Wear or heat coatings; rebuilding worn parts', aka: ['metal spraying', 'HVOF'] },
					{ id: 'PVD_COATING', label: 'PVD coating', hint: 'Hard thin coatings — tools, gold or black decorative', aka: ['PVD', 'TiN coating'] }
				]
			},
			{
				label: 'Cleaning & polishing',
				processes: [
					{ id: 'BLASTING', label: 'Shot / sand blasting', hint: 'Cleaning rust and scale; matt finish', aka: ['sand blasting', 'shot blasting'] },
					{ id: 'POLISHING', label: 'Polishing & buffing', hint: 'Shiny or satin finish', aka: ['buffing', 'mirror finish'] },
					{ id: 'ELECTROPOLISHING', label: 'Electropolishing', hint: 'Bright, clean stainless steel' },
					{ id: 'DEBURRING', label: 'Deburring (vibratory / tumbling)', hint: 'Removing sharp edges from many parts at once', aka: ['tumbling', 'vibro finishing'] },
					{ id: 'SHOT_PEENING', label: 'Shot peening', hint: 'Making springs and gears last longer' }
				]
			},
			{
				label: 'Marking & printing',
				processes: [
					{ id: 'LASER_MARKING', label: 'Laser marking & engraving', hint: 'Part numbers, logos, QR codes', aka: ['engraving', 'laser engraving'] },
					{ id: 'PAD_PRINTING', label: 'Pad & screen printing', hint: 'Logos and text on parts and panels', aka: ['screen printing'] }
				]
			}
		]
	},
	{
		id: 'INSPECTION',
		label: 'Inspection & testing',
		emoji: '🔍',
		plain: 'Checking that parts are the right size, free of cracks and the right material.',
		examples: 'CMM reports, crack testing, material test certificates',
		groups: [
			{
				label: 'Measurement',
				processes: [
					{ id: 'CMM', label: 'CMM inspection', hint: 'Accurate 3D measurement with a report', aka: ['CMM', 'coordinate measuring'] },
					{ id: 'SCANNING_3D', label: '3D scanning', hint: 'Scanning a part to compare with the drawing or copy it', aka: ['reverse engineering'] },
					{ id: 'ROUGHNESS', label: 'Surface roughness testing', hint: 'Measuring how smooth a surface is (Ra)' },
					{ id: 'LEAK_TESTING', label: 'Leak & pressure testing', hint: 'Checking parts hold air, water or oil pressure', aka: ['hydro test', 'pressure test'] }
				]
			},
			{
				label: 'Crack testing (NDT)',
				processes: [
					{ id: 'DPT', label: 'Dye penetrant test (DPT)', hint: 'Finding cracks on the surface', aka: ['DP test', 'LPT'] },
					{ id: 'MPI', label: 'Magnetic particle test (MPI)', hint: 'Finding cracks in steel parts', aka: ['MPT'] },
					{ id: 'UT', label: 'Ultrasonic testing (UT)', hint: 'Finding hidden flaws inside metal', aka: ['ultrasonic'] },
					{ id: 'RT', label: 'Radiography (X-ray)', hint: 'X-ray images of welds and castings', aka: ['X-ray', 'radiography'] }
				]
			},
			{
				label: 'Material testing',
				processes: [
					{ id: 'HARDNESS_TESTING', label: 'Hardness testing', hint: 'Checking how hard a part is (HRC, BHN)' },
					{ id: 'MECHANICAL_TESTING', label: 'Tensile & mechanical testing', hint: 'Strength tests on material samples', aka: ['tensile test', 'impact test'] },
					{ id: 'CHEMICAL_ANALYSIS', label: 'Chemical / spectro analysis', hint: 'Confirming the material grade — test certificates', aka: ['spectro', 'material test certificate', 'MTC'] },
					{ id: 'PMI', label: 'PMI (material identification)', hint: 'Quick check that the alloy is correct', aka: ['PMI'] }
				]
			}
		]
	},
	{
		id: 'ASSEMBLY_ELEC',
		label: 'Assembly & electronics',
		emoji: '🔧',
		plain: 'Putting parts together and building electrical and electronic units.',
		examples: 'Sub-assemblies, wiring harnesses, control panels, PCBs',
		groups: [
			{
				label: 'Assembly',
				processes: [
					{ id: 'MECH_ASSEMBLY', label: 'Mechanical assembly', hint: 'Assembling parts into sub-assemblies or products', aka: ['assembly', 'sub-assembly'] },
					{ id: 'BALANCING', label: 'Dynamic balancing', hint: 'Balancing rotating parts — rotors, fans, pulleys' },
					{ id: 'PACKING', label: 'Kitting & packing', hint: 'Sorting, kitting and packing parts for dispatch' }
				]
			},
			{
				label: 'Electrical & electronics',
				processes: [
					{ id: 'WIRING_HARNESS', label: 'Wiring harness', hint: 'Cable and wire assemblies', aka: ['harness', 'cable assembly'] },
					{ id: 'PANEL_WIRING', label: 'Control panel wiring', hint: 'Electrical panels and cabinets', aka: ['panel building', 'control panel'] },
					{ id: 'PCB_SMT', label: 'PCB assembly (SMT)', hint: 'Surface-mount electronics assembly', aka: ['PCB', 'SMT', 'PCBA'] },
					{ id: 'PCB_THT', label: 'PCB assembly (through-hole)', hint: 'Through-hole and hand soldering of components', aka: ['THT', 'through hole'] }
				]
			}
		]
	},
	{
		id: 'ADDITIVE',
		label: '3D printing & prototypes',
		emoji: '🖨️',
		plain: 'Making a few parts quickly, without any tooling.',
		examples: 'Prototypes, samples, jigs, small batches',
		groups: [
			{
				label: '3D printing',
				processes: [
					{ id: 'FDM', label: 'FDM 3D printing', hint: 'Low-cost plastic prototypes', aka: ['3D printing', 'FDM'] },
					{ id: 'SLA', label: 'SLA resin printing', hint: 'Smooth, detailed plastic prototypes', aka: ['resin printing'] },
					{ id: 'SLS_MJF', label: 'SLS / MJF nylon printing', hint: 'Strong, functional nylon parts', aka: ['SLS', 'MJF', 'nylon printing'] },
					{ id: 'METAL_3D', label: 'Metal 3D printing', hint: 'Metal prototypes and very complex parts', aka: ['DMLS', 'SLM', 'metal additive'] }
				]
			}
		]
	}
];

// ---------------- Lookups ----------------

export interface FlatProcess extends Process {
	shopId: string;
	group: string;
}

export const ALL_PROCESSES: FlatProcess[] = SHOPS.flatMap((s) => s.groups.flatMap((g) => g.processes.map((p) => ({ ...p, shopId: s.id, group: g.label }))));

const BY_ID = new Map(ALL_PROCESSES.map((p) => [p.id, p]));
export const SHOP_BY_ID = new Map(SHOPS.map((s) => [s.id, s]));

export const isProcessId = (id: string) => BY_ID.has(id);
export const isShopId = (id: string) => SHOP_BY_ID.has(id);
export const processById = (id: string) => BY_ID.get(id);
export const shopLabel = (id: string) => SHOP_BY_ID.get(id)?.label ?? id;

/** Every process id in a shop. */
export function processesOfShop(shopId: string): string[] {
	return ALL_PROCESSES.filter((p) => p.shopId === shopId).map((p) => p.id);
}

// ---------------- Old ids (before 2026-10-12) → new ids ----------------
// Sellers registered with the old 23-process list are converted with these (see npm run db:migrate).

export const LEGACY_PROCESS_MAP: Record<string, string[]> = {
	CNC_MACHINING: ['VMC_MILLING', 'HMC_MILLING'],
	CNC_TURNING: ['CNC_TURNING'],
	SHEET_METAL: ['SHEET_FABRICATION', 'PRESS_BRAKE'],
	PRESS_STAMPING: ['BLANKING', 'PROGRESSIVE_STAMPING'],
	LASER_CUTTING: ['SHEET_LASER', 'PLASMA_CUTTING'],
	DIE_CASTING: ['DIE_CASTING'],
	SAND_CASTING: ['SAND_CASTING', 'GRAVITY_DIE_CASTING'],
	INVESTMENT_CASTING: ['INVESTMENT_CASTING'],
	FORGING: ['HOT_FORGING'],
	INJECTION_MOULDING: ['INJECTION_MOULDING'],
	RUBBER_MOULDING: ['RUBBER_MOULDING'],
	TOOL_DIE: ['PRESS_TOOLS', 'INJECTION_MOULDS', 'DIE_CASTING_DIES', 'JIGS_FIXTURES'],
	WELDING_FABRICATION: ['MIG_WELDING', 'STRUCTURAL_FABRICATION'],
	GEAR_MANUFACTURING: ['GEAR_CUTTING'],
	GRINDING: ['CYL_GRINDING', 'SURFACE_GRINDING'],
	HEAT_TREATMENT: ['HARDENING'],
	SURFACE_TREATMENT: ['ZINC_PLATING', 'ANODISING', 'POWDER_COATING'],
	'3D_PRINTING': ['FDM', 'SLA'],
	ASSEMBLY: ['MECH_ASSEMBLY'],
	INSPECTION_TESTING: ['CMM'],
	PCB_ELECTRONICS: ['PCB_SMT']
};

export const LEGACY_SHOP_MAP: Record<string, string> = {
	METAL_CUTTING: 'MACHINE_SHOP',
	METAL_FORMING: 'SHEET_PRESS',
	CASTING: 'FOUNDRY',
	MOLDING: 'PLASTICS',
	TREATMENT: 'FINISHING',
	ASSEMBLY_FABRICATION: 'FABRICATION',
	TOOLING: 'TOOL_ROOM',
	ADDITIVE: 'ADDITIVE'
};

/** Current ids only: old ids are converted, unknown ids dropped, duplicates removed. */
export function normalizeProcesses(ids: readonly string[]): string[] {
	const out = new Set<string>();
	for (const id of ids) {
		if (isProcessId(id)) out.add(id);
		else for (const n of LEGACY_PROCESS_MAP[id] ?? []) out.add(n);
	}
	return [...out];
}

export const normalizeShop = (id: string) => (isShopId(id) ? id : (LEGACY_SHOP_MAP[id] ?? ''));

// ---------------- Search ----------------

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Processes matching what someone typed — by name, other names (VMC, wire cut…), explanation or shop. */
export function searchProcesses(term: string): FlatProcess[] {
	const phrase = norm(term);
	const words = phrase.split(' ').filter(Boolean);
	if (!words.length) return [];
	// Best first: the exact name / other name, then names that contain it, then explanation matches.
	const rank = (p: FlatProcess) => {
		const names = [p.label, ...(p.aka ?? [])].map(norm);
		if (names.some((n) => n === phrase)) return 0;
		if (names.some((n) => n.includes(phrase))) return 1;
		return 2;
	};
	return ALL_PROCESSES.filter((p) => {
		const hay = norm([p.label, p.hint, p.group, ...(p.aka ?? []), SHOP_BY_ID.get(p.shopId)?.label ?? ''].join(' '));
		return words.every((w) => hay.includes(w));
	}).sort((a, b) => rank(a) - rank(b));
}
