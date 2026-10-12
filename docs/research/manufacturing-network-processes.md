# Research: Manufacturing Network supplier search (UK)

Source: https://www.manufacturingnetwork.com/suppliersearch/ — public pages only, explored 2026-10-10.
Purpose: input for eYantrik's process list (see docs/brain.md → "Process list"). This is reference material, not our list.

## How their search works
- Three ways in: type-ahead process search, browse a category tree, and a **capability search** (tick several processes → suppliers who do ALL of them).
- Each process has a description page + supplier list (sort "Best", 10/13/20/50 per page). Cards: name, tagline, address, link.
- Supplier results, profiles, shortlist and saved searches need a login (not seen).

## Key finding: no attribute dropdowns
Details are encoded in the **process names** instead of filters:
- size bands — "CNC Turning" (< 1500 mm long / 650 mm Ø) vs "Large CNC Turning"; Large milling > 1500 mm square or > 4500 mm long
- material — Ferrous vs Non-Ferrous (casting)
- geometry — 2D / 3D / Tube & Section (cutting)
- machine — CNC vs Manual, Light vs Heavy
- environment — Clean-room moulding / assembly
- certification — a whole "Coded Welding" group
Each process has a plain description with "for bigger parts see…" cross-links; family pages list "processes typically combined with".

## Their full process tree (317 processes in 7 families; IDs are category_group_process)


### Shaping (58)

- **Machining** (28): CNC Turning `198_200_210`, Sliding Head CNC Turning `198_200_211`, Large CNC Turning `198_200_212`, Manual Turning `198_200_213`, CNC Milling `198_201_215`, Large CNC Milling `198_201_216`, Manual Milling `198_201_217`, Turn-Milling `198_202`, EDM Spark Erosion `198_203_218`, EDM Wire Erosion `198_203_219`, EDM Hole Drilling `198_203_220`, CNC Drilling `198_204_221`, Deep Hole Drilling `198_204_222`, Radial Drilling `198_204_223`, Reaming `198_204_696`, Honing `198_205_224`, Burnishing `198_205_225`, Linear Broaching `198_206_229`, Rotary Broaching `198_206_458`, Gear Cutting, Splining & Hobbing `198_207`, Vertical Boring `198_208_231`, Large Vertical Boring `198_208_232`, Horizontal Boring `198_208_233`, Large Horizontal Boring `198_208_234`, Jig Boring `198_208_235`, CNC Routing & Trimming `198_209_236`, Edge Preparation `198_209_594`, Electrochemical Machining (ECM) `198_670`
- **Micro Machining & Cutting** (7): Laser Micro Machining `237_238`, Laser Drilling `237_239`, Micro Laser Cutting `237_240`, Chemical Etching `237_241`, Photolithography `237_697`, LIGA `237_698`, Mechanical Micromachining `237_700`
- **Grinding** (10): External Cylindrical Grinding `242_243_244`, Internal Cylindrical Grinding `242_243_245`, Through-feed Centreless Grinding `242_246_247`, End-feed Centreless Grinding `242_246_248`, In-Feed Centreless Grinding `242_246_596`, Reciprocating Surface Grinding `242_249_250`, Plough Grinding `242_249_251`, CNC Jig Grinding `242_252_253`, Manual Jig Grinding `242_252_254`, Tool & Cutter Grinding `242_255`
- **CNC Profile Cutting** (13): 2D Laser Cutting `256_257_262`, 3D Laser Cutting `256_257_263`, Tube & Section Laser Cutting `256_257_264`, CNC Turret Punching `256_258_266`, CNC Laser Punching `256_258_267`, 2D Flame Cutting `256_259_268`, 3D Flame Cutting `256_259_269`, Tube & Section Flame Cutting `256_259_270`, 2D Plasma Cutting `256_260_271`, 3D Plasma Cutting `256_260_272`, Tube & Section Plasma Cutting `256_260_273`, 2D Water Jet Cutting `256_261_274`, 3D Water Jet Cutting `256_261_275`

### Forming (47)

- **Tube, Pipe & Section Forming** (11): Tube Tapering `276_277_287`, Tube End Expansion `276_277_288`, Tube End Reduction `276_277_289`, Tube End Flaring `276_277_290`, Tube Beading `276_277_291`, Tube End Shaping `276_277_292`, Micro Tube End Shaping `276_277_701`, Hot Extrusion Die Forming `276_285_597`, Cold Extrusion Die Forming `276_285_598`, Ceramic Extrusion Die Forming `276_285_599`, Tube Hydroforming `276_286`
- **Sheet & Plate Forming** (7): Single Die Forming `293_294_298`, Progressive Die Forming `293_294_299`, Deep Drawing `293_294_300`, CNC Spinning `293_295_301`, Hand Spinning `293_295_302`, Sheet Hydroforming `293_296`, Shot Peen Forming `293_297`
- **Casting** (13): Ferrous Sand Casting `303_304_312`, Non-Ferrous Sand Casting `303_304_314`, Ferrous Investment Casting `303_305_315`, Non-Ferrous Investment Casting `303_305_316`, Gravity Die Casting `303_306`, Low Pressure Die Casting `303_307`, High Pressure Die Casting `303_308`, Ferrous Shell Moulding `303_309_317`, Non-Ferrous Shell Moulding `303_309_318`, Ferrous Centrifugal Casting `303_310_319`, Non-Ferrous Centrifugal Casting `303_310_320`, Ferrous Lost Foam Casting `303_311_321`, Non-Ferrous Lost Foam Casting `303_311_322`
- **Bulk Forming** (16): Closed Die Hot Forging `323_324_331`, Open Die Hot Forging `323_324_332`, Hot Forged Ring Rolling `323_324_333`, Hot Upset Forging `323_324_334`, Hot Radial Forging & Swaging `323_324_335`, Impact Extrusion `323_325_338`, Cold Upset Forging & Heading `323_325_622`, Cold Forging `323_325_623`, Thread Rolling `323_326_339`, Spline & Gear Rolling `323_326_340`, Hot Isostatic Pressing (HIP) `323_327_341`, Cold Isostatic Pressing (CIP) `323_327_342`, Metal Powder Forging `323_328_343`, Ceramic Powder Forging `323_328_344`, Metal Injection Moulding `323_329`, Ceramic Injection Moulding `323_330`

### Bending (16)

- **Tube, Pipe & Section Bending** (8): CNC Tube & Section Bending `345_346_352`, Tube & Section Press Bending `345_346_353`, Tube & Section Ring Rolling `345_346_354`, Aluminium & Non-Ferrous Extrusion Bending `345_346_355`, Pipe & Section Cold Bending `345_347_348`, Pipe & Section Induction Bending `345_347_349`, Wire Forming `345_350`, Strip Forming `345_351`
- **Plate & Sheet Metal Bending & Rolling** (8): Sheet Metal Bending & Press Braking `356_357`, Plate Bending & Press Braking `356_358`, Conventional Sheet Metal Rolling `356_359_361`, Conical Sheet Metal Rolling `356_359_362`, Conventional Plate Rolling `356_366_367`, Heavy Plate Rolling `356_366_368`, Conical Plate Rolling `356_366_369`, Profile Roll Forming `356_370`

### Moulding & Additive (35)

- **Plastic Moulding** (18): Conventional Injection Moulding `371_374_375`, Clean Room Injection Moulding `371_374_380`, Multi-Shot Injection Moulding `371_374_381`, Low Pressure Injection Moulding `371_374_382`, Gas Assisted Injection Moulding `371_374_383`, Structural Foam Injection Moulding `371_374_384`, Reaction Injection Moulding (RIM) `371_374_385`, Injection Blow Moulding `371_386_387`, Extrusion Blow Moulding `371_386_388`, Vacuum Thermoforming `371_389_390`, Pressure Thermoforming `371_389_391`, Twin-Sheet Thermoforming `371_389_392`, Drape Thermoforming `371_389_393`, Dip Moulding `371_394`, Rotational Moulding `371_395`, Compression Moulding `371_396`, Transfer Moulding `371_397`, Vacuum Casting - Plastic `371_398`
- **Composite Moulding** (12): Hand Lay Up `372_399_404`, Spray Lay Up `372_399_405`, Filament Winding `372_399_406`, Vacuum Bag Moulding `372_400_702`, Resin Infusion `372_400_703`, Resin Transfer Moulding `372_400_704`, Vacuum Assisted Resin Transfer `372_400_705`, Compression Moulding - Composites `372_400_706`, Pultrusion `372_400_707`, Reinforced Reaction Injection Moulding `372_400_708`, Centrifugal Casting - Composites `372_400_709`, Continuous Lamination `372_400_710`
- **Additive Manufacture** (5): Selective Laser Sintering (SLS) `373_408`, Metal Additive Manufacture (DMLS/SLM) `373_409`, Stereolithography (SLA) `373_410`, Fused Deposition Modelling (FDM) `373_411`, 3D Printing `373_412`

### Joining (31)

- **Welding** (12): Metal Inert Gas Welding (MIG) `413_416_420`, Tungsten Inert Gas Welding (TIG) `413_416_421`, Manual Metal Arc Welding (MMA) `413_416_422`, Submerged Arc Welding (SAW) `413_416_423`, Plasma Arc Welding (PAW) `413_416_424`, Laser Beam Welding `413_417_425`, Electron Beam Welding `413_417_426`, Rotary Friction Welding `413_418_427`, Linear Friction Welding `413_418_428`, Friction Stir Welding `413_418_429`, Spot & Projection Welding `413_419_430`, Resistance Seam Welding `413_419_431`
- **Coded Welding** (12): Coded Metal Inert Gas Welding (MIG) `414_432_436`, Coded Tungsten Inert Gas Welding (TIG) `414_432_437`, Coded Manual Metal Arc Welding (MMA) `414_432_438`, Coded Submerged Arc Welding (SAW) `414_432_439`, Coded Plasma Arc Welding (PAW) `414_432_440`, Coded Laser Beam Welding `414_433_441`, Coded Electron Beam Welding `414_433_442`, Coded Rotary Friction Welding `414_434_443`, Coded Linear Friction Welding `414_434_444`, Coded Friction Stir Welding `414_434_445`, Coded Spot & Projection Welding `414_435_446`, Coded Resistance Seam Welding `414_435_447`
- **Brazing & Soldering** (7): Atmosphere Furnace Brazing `415_448_450`, Vacuum Brazing `415_448_451`, Salt Bath Brazing `415_448_452`, Induction Brazing `415_448_453`, Manual Flame Brazing `415_448_454`, Silver Soldering `415_449_455`, Soft Soldering `415_449_456`

### Finishing & Treatments (87)

- **Heat Treatment** (16): Nitriding `459_508_516`, Plasma Nitriding `459_508_517`, Nitrocarburising `459_508_518`, Carburising `459_508_519`, Carbonitriding `459_508_520`, Boriding `459_508_521`, Flame Hardening `459_508_522`, Induction Hardening `459_508_523`, Laser Hardening `459_508_524`, Open Air Furnace Heat Treatment `459_509`, Inert Atmosphere Heat Treatment `459_510`, Semi-Inert Atmosphere Heat Treatment `459_511`, Vacuum Furnace Heat Treatment `459_512`, Salt Bath Heat Treatment `459_513`, Cryogenic & Sub-Zero Treatments `459_514`, Solution Heat Treatment & Ageing `459_515`
- **Part Marking & Decoration** (16): Laser Marking & Etching `460_548`, Plasma Marking & Etching `460_549`, Chemical Etch Part Marking `460_550`, Engraving & Scribe Marking `460_551`, Dot Peen Marking `460_552`, Abrasive Etching & Marking `460_553`, Pad Printing `460_611_612`, Sublimation Printing `460_611_613`, Screen Printing `460_611_614`, Lithography `460_611_711`, Digital Printing `460_611_712`, Gravure `460_611_713`, Flexography `460_611_714`, Hydro Transfer Printing `460_611_715`, Flocking `460_611_716`, Foil Blocking `460_611_717`
- **Painting & General Coating** (6): Wet Spray Painting `461_496_581`, Stove Enamelling `461_496_615`, Electrophoretic Painting `461_496_616`, Powder Coating `461_497`, Glass Flake Coating `461_499`, Zinc Flake Coating `461_617`
- **Cleaning & Deburring** (11): Pickling `462_525_583`, Ultrasonic Cleaning `462_525_584`, Laser Cleaning `462_525_585`, Degreasing & Washing `462_525_586`, Vibratory & Tumble Deburring `462_526_541`, Electrochemical Deburring (ECD) `462_526_542`, Abrasive Flow Deburring `462_526_543`, Shot Blasting `462_527_528`, Bead Blasting `462_527_529`, Grit Blasting `462_527_530`, Vapour Blasting `462_527_531`
- **Polishing, Lapping & Peening** (9): Mechanical Polishing `463_535_587`, Electropolishing `463_535_588`, Vibratory & Tumble Polishing `463_535_589`, Single Sided Flat Lapping `463_536_590`, Double Sided Flat Lapping `463_536_591`, Cylindrical Lapping `463_536_592`, Metal Shot Peening `463_537_538`, Glass & Ceramic Bead Peening `463_537_539`, Laser Peening `463_537_540`
- **Metal Plating** (15): Zinc Plating `464_554_562`, Zinc Alloy Plating `464_554_563`, Decorative Chrome Plating `464_555_564`, Hard Chrome Plating `464_555_565`, Nickel Electroplating `464_556_567`, Electroless Nickel Plating `464_556_568`, Silver Plating `464_557_569`, Gold Plating `464_557_570`, Cadmium Plating `464_557_571`, Rhodium Plating `464_557_572`, Palladium Plating `464_557_573`, Copper Plating `464_558_574`, Brass Plating `464_558_575`, Bronze Plating `464_558_576`, Tin Plating `464_558_577`
- **Conversion Coatings** (8): Zinc Phosphating `480_618_619`, Manganese Phosphating `480_618_620`, Iron Phosphating `480_618_621`, Chromic Anodising `480_660_663`, Sulphuric Acid Anodising `480_660_664`, Hard Anodising `480_660_665`, Chromate Conversion Coating `480_661`, Chemical Blacking `480_662`
- **Engineering Coatings & Cladding** (6): Physical Vapour Deposition (PVD) `624_625`, Chemical Vapour Deposition (CVD) `624_626`, Technical Polymer Coating `624_627`, Thermal Spraying `624_628`, Hot Dip Galvanising `624_629`, Metal Overlay Cladding `624_630`

### Inspection & Assembly (43)

- **Inspection** (33): Coordinate Measurement (CMM) `631_632_633`, Manual Measurement `631_632_634`, 2D Vision System Inspection `631_632_635`, 3D Laser Scanning `631_632_636`, Surface Roughness Measurment `631_637_666`, Flatness Measurement `631_637_667`, Air Decay Pressure Testing `631_638_639`, Water Decay Pressure Testing `631_638_640`, Pneumatic Pressure Testing `631_638_641`, Hydraulic Pressure Testing `631_638_642`, Sniffer Leak Detection `631_638_695`, Dye Penetrant Inspection `631_643_644`, Magnetic Particle Inspection `631_643_645`, Ultrasonic Inspection `631_646_647`, Radiographic Examination (X-Ray) `631_646_648`, Eddy Current Testing `631_646_649`, Ultrasonic Immersion Inspection `631_646_689`, Time of Flight Diffraction Inspection `631_646_690`, Phased Array Inspection `631_646_691`, Fusion Weld Visual Examination `631_650_651`, Remote Visual Inspection (RVI) `631_650_652`, Microscopic Evaluation `631_650_687`, Photographic Inspection `631_650_688`, Hardness Testing `631_653_654`, Tensile Testing `631_653_655`, Impact Testing `631_653_656`, Positive Material Identification (PMI) Testing `631_653_679`, Chemical Analysis `631_653_680`, Metallurgical Testing `631_653_681`, Micrographic Testing `631_653_682`, Feritscope Analysis `631_653_683`, Electromagnetic Compatibility (EMC) Testing `631_692_693`, Electrostatic Discharge (ESD) Testing `631_692_694`
- **Assembly** (10): General Manual Assembly `657_658`, Automated Assembly `657_668`, Dynamic Balancing `657_669`, Electrical & Wiring Assembly `657_671`, Clean Room Assembly `657_672`, Electrical Panel & Cabinet Assembly `657_674`, PCB Assembly, Surface Mounting `657_675`, PCB Assembly, Through-Hole `657_676`, On-Site Hydraulic Bolt Tightening `657_677`, Coil Winding `657_678`


### Retired / out-of-tree IDs (13) — ignored
Arc Welding `8_9`, Boring `22_29`, Drilling & Reaming `22_41`, High Definition Plasma Arc Cutting `64_69`, Extrusion Die Forming `80_85`, Die Casting `97_102`, Continuous Casting `97_106`, Superforming `114_115`, Panel Beating `114_117`, Forging `152_157`, Form Rolling `152_166`, Contact Moulding `187_192`, Leak Detection & Pressure Testing `465_468`
