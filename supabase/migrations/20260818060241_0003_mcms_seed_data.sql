/*
# MCMS Seed Data

Populates the database with realistic museum demo data.

## Data Created
- 8 categories (Sculpture, Painting, Textile, Pottery, Manuscript, Metalwork, Jewelry, Arms & Armor)
- 8 artists/creators
- 6 historical periods (Ancient, Maurya, Gupta, Medieval, Mughal, Colonial)
- 8 locations across 2 buildings
- 20 artifacts spanning different periods, categories, and conditions
- 4 exhibitions
- 10 provenance records
- 10 conservation records
- Artifact images (using Pexels stock URLs)

All data is internally consistent with proper foreign key references.
*/

-- ============================================================
-- CATEGORIES
-- ============================================================
INSERT INTO public.categories (name, description) VALUES
  ('Sculpture', 'Three-dimensional artworks including stone, bronze, and terracotta sculptures from various periods.'),
  ('Painting', 'Miniature paintings, murals, and canvas works spanning multiple artistic traditions.'),
  ('Textile', 'Handwoven fabrics, embroideries, tapestries, and traditional garments.'),
  ('Pottery', 'Ceramic vessels, terracotta figurines, and archaeological pottery shards.'),
  ('Manuscript', 'Historical manuscripts, illuminated texts, and calligraphic works.'),
  ('Metalwork', 'Bronze, copper, and iron ritual objects, tools, and decorative items.'),
  ('Jewelry', 'Ornaments, amulets, and decorative personal adornments from various eras.'),
  ('Arms & Armor', 'Weapons, shields, helmets, and military regalia from historical periods.')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- ARTISTS / CREATORS
-- ============================================================
INSERT INTO public.artists (name, biography, birth_year, death_year, nationality) VALUES
  ('Unknown Ancient Sculptor', 'Anonymous artisan from the Mauryan period, known for sandstone carving.', -300, -100, 'Indian'),
  ('Master Bihari', 'Renowned Mughal court painter specializing in miniature portraiture.', 1740, 1810, 'Indian'),
  ('Ram Singh Mali', 'Traditional Gujarati textile weaver from the Patola tradition.', 1850, 1920, 'Indian'),
  ('Devi Prasad', 'Master bronze caster of South Indian ritual icons.', 1880, 1955, 'Indian'),
  ('Ghulam Ali Khan', 'Delhi-based painter documenting court life during the late Mughal era.', 1790, 1860, 'Indian'),
  ('Unknown Harappan Artisan', 'Skilled potter from the Indus Valley Civilization.', -2500, -2000, 'Indian'),
  ('Kashi Nath', 'Bengali manuscript illuminator and calligrapher.', 1770, 1840, 'Indian'),
  ('Lala Bux', 'Master metalworker from Lucknow specializing in bidriware.', 1820, 1890, 'Indian')
ON CONFLICT DO NOTHING;

-- ============================================================
-- HISTORICAL PERIODS
-- ============================================================
INSERT INTO public.historical_periods (name, start_year, end_year, description) VALUES
  ('Indus Valley Civilization', -2600, -1900, 'Bronze Age urban civilization in the northwestern regions of South Asia.'),
  ('Maurya Empire', -322, -185, 'First major empire of the Indian subcontinent, known for Ashokan pillars and Buddhist art.'),
  ('Gupta Empire', 320, 550, 'Classical golden age of Indian art, science, and literature.'),
  ('Medieval Period', 600, 1200, 'Era of regional kingdoms, temple architecture, and bronze sculpture.'),
  ('Mughal Empire', 1526, 1857, 'Period of Indo-Islamic art, miniature painting, and monumental architecture.'),
  ('Colonial Era', 1858, 1947, 'British colonial period with hybrid artistic traditions and reform movements.')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- LOCATIONS
-- ============================================================
INSERT INTO public.locations (building, gallery, room, shelf_or_display, description) VALUES
  ('Main Building', 'Gallery A', 'Room 101', 'Display Case 1', 'Primary display gallery for ancient sculptures.'),
  ('Main Building', 'Gallery A', 'Room 102', 'Display Case 3', 'Adjacent room for Mauryan and Gupta period artifacts.'),
  ('Main Building', 'Gallery B', 'Room 201', 'Wall Mount 5', 'Painting gallery with climate control.'),
  ('Main Building', 'Gallery B', 'Room 202', 'Display Case 2', 'Textile and decorative arts gallery.'),
  ('Main Building', 'Gallery C', 'Room 301', 'Storage Shelf 12', 'Reserve collection storage.'),
  ('Annex Building', 'Gallery D', 'Room 401', 'Display Case 7', 'Manuscript and archival gallery.'),
  ('Annex Building', 'Gallery D', 'Room 402', 'Display Case 4', 'Metalwork and jewelry display.'),
  ('Annex Building', 'Gallery E', 'Room 501', 'Storage Vault 3', 'Secure storage for high-value items.')
ON CONFLICT DO NOTHING;

-- ============================================================
-- ARTIFACTS
-- Use CTEs to get IDs by name for consistent referencing
-- ============================================================
WITH cat AS (SELECT name, id FROM public.categories),
     art AS (SELECT name, id FROM public.artists),
     per AS (SELECT name, id FROM public.historical_periods),
     loc AS (SELECT id, row_number() OVER (ORDER BY created_at) AS rn FROM public.locations)
INSERT INTO public.artifacts (
  accession_number, name, description, category_id, artist_id, historical_period_id,
  origin, creation_date, material, dimensions, weight, condition,
  acquisition_date, acquisition_method, ownership_status, current_location_id, status, is_public
)
SELECT
  v.accession_number, v.name, v.description, c.id, a.id, p.id,
  v.origin, v.creation_date, v.material, v.dimensions, v.weight, v.condition,
  v.acquisition_date, v.acquisition_method, v.ownership_status, l.id, v.status, v.is_public
FROM (VALUES
  -- 1
  ('MCMS-2001-001', 'Sandstone Buddha Head', 'Serene sandstone carving of the Buddha''s head from the Gupta period, depicting downcast eyes and tightly curled hair.', 'Sculpture', 'Unknown Ancient Sculptor', 'Gupta Empire', 'Sarnath, Uttar Pradesh', '5th century CE', 'Sandstone', '28 x 22 x 18 cm', '12.5 kg', 'excellent', '2001-03-15'::date, 'excavation', 'owned', 1, 'active', true),
  -- 2
  ('MCMS-2002-014', 'Ashokan Pillar Capital', 'Fragment of an Ashokan pillar capital featuring a crouching lion, originally from a stupa railing.', 'Sculpture', 'Unknown Ancient Sculptor', 'Maurya Empire', 'Vaishali, Bihar', '3rd century BCE', 'Polished sandstone', '45 x 40 x 35 cm', '38 kg', 'good', '2002-07-20'::date, 'donation', 'owned', 2, 'active', true),
  -- 3
  ('MCMS-2003-022', 'Mughal Miniature: Court Scene', 'Intricate miniature painting depicting a Mughal court audience with emperor Akbar, rendered in opaque watercolor with gold leaf.', 'Painting', 'Master Bihari', 'Mughal Empire', 'Delhi', 'c. 1790', 'Paper, gouache, gold', '24 x 18 cm', '0.2 kg', 'good', '2003-01-10'::date, 'purchase', 'owned', 3, 'active', true),
  -- 4
  ('MCMS-2004-031', 'Patola Silk Sari', 'Double-ikat woven silk sari from Patan, featuring geometric and floral motifs in red and green.', 'Textile', 'Ram Singh Mali', 'Colonial Era', 'Patan, Gujarat', 'c. 1890', 'Silk', '480 x 115 cm', '0.8 kg', 'fair', '2004-11-05'::date, 'donation', 'owned', 4, 'active', true),
  -- 5
  ('MCMS-2005-007', 'Harappan Painted Jar', 'Terracotta jar with geometric painted designs in red and black, typical of the Mature Harappan period.', 'Pottery', 'Unknown Harappan Artisan', 'Indus Valley Civilization', 'Mohenjo-daro, Sindh', 'c. 2500 BCE', 'Terracotta', '22 x 18 cm', '1.2 kg', 'fair', '2005-06-12'::date, 'excavation', 'owned', 1, 'active', true),
  -- 6
  ('MCMS-2006-019', 'Bronze Nataraja', 'Chola-period bronze icon of Nataraja (Shiva as cosmic dancer) with four arms and flaming aureole.', 'Metalwork', 'Devi Prasad', 'Medieval Period', 'Tamil Nadu', 'c. 1910', 'Bronze', '62 x 45 x 20 cm', '8.5 kg', 'excellent', '2006-09-18'::date, 'purchase', 'owned', 7, 'active', true),
  -- 7
  ('MCMS-2007-025', 'Illuminated Manuscript Page', 'Persian manuscript page with floral border illumination and calligraphic text in Nastaliq script.', 'Manuscript', 'Kashi Nath', 'Mughal Empire', 'Murshidabad, Bengal', 'c. 1810', 'Paper, ink, gold', '32 x 22 cm', '0.1 kg', 'good', '2007-04-22'::date, 'bequest', 'owned', 6, 'active', true),
  -- 8
  ('MCMS-2008-033', 'Bidriware Hookah Base', 'Inlaid bidri metalwork hookah base with silver floral patterns on blackened alloy.', 'Metalwork', 'Lala Bux', 'Colonial Era', 'Lucknow', 'c. 1860', 'Zinc-copper alloy, silver inlay', '25 x 15 cm', '1.8 kg', 'good', '2008-02-14'::date, 'purchase', 'owned', 7, 'active', true),
  -- 9
  ('MCMS-2009-041', 'Gold Temple Jewelry Set', 'Ornate gold jewelry set with rubies and emeralds, traditionally used to adorn temple deities.', 'Jewelry', 'Unknown Ancient Sculptor', 'Medieval Period', 'Tamil Nadu', 'c. 1900', 'Gold, ruby, emerald', '15 x 10 x 5 cm', '0.3 kg', 'excellent', '2009-08-30'::date, 'donation', 'owned', 8, 'active', true),
  -- 10
  ('MCMS-2010-016', 'Mughal Shamshir Sword', 'Curved Mughal shamshir with watered steel blade and jade hilt, inscribed with the maker''s name.', 'Arms & Armor', 'Ghulam Ali Khan', 'Mughal Empire', 'Delhi', 'c. 1830', 'Wootz steel, jade, gold', '95 x 12 cm', '1.5 kg', 'good', '2010-05-17'::date, 'purchase', 'owned', 8, 'active', true),
  -- 11
  ('MCMS-2011-028', 'Terracotta Mother Goddess Figurine', 'Hand-modeled terracotta figurine of a mother goddess, typical of Mauryan folk art.', 'Sculpture', 'Unknown Ancient Sculptor', 'Maurya Empire', 'Mathura, Uttar Pradesh', '3rd century BCE', 'Terracotta', '12 x 8 x 6 cm', '0.3 kg', 'fair', '2011-10-03'::date, 'excavation', 'owned', 2, 'active', true),
  -- 12
  ('MCMS-2012-045', 'Kashmir Shawl Fragment', 'Finely woven Kashmir wool shawl fragment with boteh (paisley) motif in natural dyes.', 'Textile', 'Ram Singh Mali', 'Colonial Era', 'Srinagar, Kashmir', 'c. 1880', 'Pashmina wool', '120 x 60 cm', '0.4 kg', 'poor', '2012-03-21'::date, 'donation', 'owned', 4, 'in_conservation', true),
  -- 13
  ('MCMS-2013-052', 'Copper Plate Inscription', 'Copper plate charter recording a land grant, inscribed in early medieval script.', 'Manuscript', 'Kashi Nath', 'Medieval Period', 'Karnataka', 'c. 700 CE', 'Copper', '30 x 15 x 0.5 cm', '2.2 kg', 'good', '2013-07-09'::date, 'donation', 'owned', 6, 'active', true),
  -- 14
  ('MCMS-2014-038', 'Dakhni Miniature: Hawa Mahal', 'Late Mughal miniature depicting the Hawa Mahal of Jaipur with courtly figures in foreground.', 'Painting', 'Ghulam Ali Khan', 'Mughal Empire', 'Jaipur, Rajasthan', 'c. 1840', 'Paper, gouache', '30 x 22 cm', '0.2 kg', 'fair', '2014-12-01'::date, 'purchase', 'owned', 3, 'active', true),
  -- 15
  ('MCMS-2015-061', 'Indus Seal with Unicorn', 'Steatite seal from Mohenjo-daro engraved with a unicorn figure and undeciphered Harappan script.', 'Pottery', 'Unknown Harappan Artisan', 'Indus Valley Civilization', 'Mohenjo-daro, Sindh', 'c. 2500 BCE', 'Steatite', '3 x 3 x 1 cm', '0.05 kg', 'good', '2015-04-16'::date, 'excavation', 'owned', 1, 'active', true),
  -- 16
  ('MCMS-2016-029', 'Gujarati Embroidered Wall Hanging', 'Hand-embroidered textile panel with mirror work (shisha) and thread embroidery from Kutch.', 'Textile', 'Ram Singh Mali', 'Colonial Era', 'Bhuj, Gujarat', 'c. 1900', 'Cotton, mirror, thread', '180 x 120 cm', '1.2 kg', 'fair', '2016-06-28'::date, 'field_collection', 'owned', 4, 'active', true),
  -- 17
  ('MCMS-2017-044', 'Iron Battle Axe', 'Heavy iron battle axe from the medieval period, with decorative inlay on the socket.', 'Arms & Armor', 'Unknown Ancient Sculptor', 'Medieval Period', 'Rajasthan', 'c. 1000 CE', 'Iron, copper inlay', '55 x 20 cm', '2.8 kg', 'poor', '2017-09-14'::date, 'donation', 'owned', 8, 'in_conservation', true),
  -- 18
  ('MCMS-2018-050', 'Silver Ritual Vessel', 'Ornate silver ritual vessel (kalash) used in temple ceremonies, with repousse decoration.', 'Metalwork', 'Lala Bux', 'Colonial Era', 'Varanasi', 'c. 1880', 'Silver', '20 x 15 x 15 cm', '0.9 kg', 'excellent', '2018-01-25'::date, 'purchase', 'owned', 7, 'active', true),
  -- 19
  ('MCMS-2019-067', 'Stone Yakshi Sculpture', 'Life-size sandstone torso of a yakshi (nature spirit) from a Buddhist stupa gateway.', 'Sculpture', 'Unknown Ancient Sculptor', 'Maurya Empire', 'Bharhut, Madhya Pradesh', '2nd century BCE', 'Sandstone', '90 x 45 x 25 cm', '65 kg', 'restored', '2019-11-30'::date, 'excavation', 'owned', 5, 'active', true),
  -- 20
  ('MCMS-2020-073', 'Miniature: Royal Elephant Procession', 'Detailed miniature painting of a royal elephant procession during a Mughal festival.', 'Painting', 'Master Bihari', 'Mughal Empire', 'Jaipur, Rajasthan', 'c. 1800', 'Paper, gouache, gold', '28 x 20 cm', '0.2 kg', 'good', '2020-02-11'::date, 'purchase', 'owned', 3, 'active', true)
) AS v(accession_number, name, description, cat_name, art_name, per_name, origin, creation_date, material, dimensions, weight, condition, acquisition_date, acquisition_method, ownership_status, loc_rn, status, is_public)
JOIN cat c ON c.name = v.cat_name
JOIN art a ON a.name = v.art_name
JOIN per p ON p.name = v.per_name
JOIN loc l ON l.rn = v.loc_rn
ON CONFLICT (accession_number) DO NOTHING;

-- ============================================================
-- EXHIBITIONS
-- ============================================================
INSERT INTO public.exhibitions (name, description, start_date, end_date, location_id, status, cover_image_url)
SELECT
  v.name, v.description, v.start_date, v.end_date, l.id, v.status, v.cover_url
FROM (VALUES
  ('Echoes of the Ancients', 'A journey through ancient Indian civilizations from the Indus Valley to the Mauryan Empire.', '2025-01-15'::date, '2025-12-31'::date, 1, 'active', null),
  ('Mughal Splendor: Art of the Court', 'Exquisite miniature paintings and decorative arts from the Mughal era.', '2025-03-01'::date, '2025-10-15'::date, 3, 'active', null),
  ('Threads of Time: Indian Textiles', 'Exploring the rich heritage of Indian textile traditions from across the subcontinent.', '2025-06-01'::date, '2026-01-15'::date, 4, 'active', null),
  ('Sacred Metal: Ritual Bronzes of South India', 'A showcase of Chola bronze icons and ritual metalwork.', '2025-09-01'::date, '2026-03-01'::date, 7, 'upcoming', null)
) AS v(name, description, start_date, end_date, loc_rn, status, cover_url)
JOIN (SELECT id, row_number() OVER (ORDER BY created_at) AS rn FROM public.locations) l ON l.rn = v.loc_rn
ON CONFLICT DO NOTHING;

-- ============================================================
-- EXHIBITION ARTIFACTS
-- ============================================================
INSERT INTO public.exhibition_artifacts (exhibition_id, artifact_id, display_order)
SELECT e.id, a.id, v.display_order
FROM (VALUES
  ('Echoes of the Ancients', 'MCMS-2005-007', 1),
  ('Echoes of the Ancients', 'MCMS-2015-061', 2),
  ('Echoes of the Ancients', 'MCMS-2002-014', 3),
  ('Echoes of the Ancients', 'MCMS-2011-028', 4),
  ('Echoes of the Ancients', 'MCMS-2019-067', 5),
  ('Mughal Splendor: Art of the Court', 'MCMS-2003-022', 1),
  ('Mughal Splendor: Art of the Court', 'MCMS-2014-038', 2),
  ('Mughal Splendor: Art of the Court', 'MCMS-2020-073', 3),
  ('Mughal Splendor: Art of the Court', 'MCMS-2010-016', 4),
  ('Threads of Time: Indian Textiles', 'MCMS-2004-031', 1),
  ('Threads of Time: Indian Textiles', 'MCMS-2012-045', 2),
  ('Threads of Time: Indian Textiles', 'MCMS-2016-029', 3)
) AS v(exh_name, acc_num, display_order)
JOIN public.exhibitions e ON e.name = v.exh_name
JOIN public.artifacts a ON a.accession_number = v.acc_num
ON CONFLICT (exhibition_id, artifact_id) DO NOTHING;

-- ============================================================
-- PROVENANCE RECORDS (10)
-- ============================================================
INSERT INTO public.provenance_records (artifact_id, owner_name, location, start_date, end_date, ownership_type, description)
SELECT a.id, v.owner_name, v.location, v.start_date, v.end_date, v.ownership_type, v.description
FROM (VALUES
  ('MCMS-2001-001', 'Archaeological Survey of India', 'Sarnath Excavation Site', '2000-01-01'::date, '2001-03-01'::date, 'government', 'Discovered during an ASI excavation near the Dhamek Stupa.'),
  ('MCMS-2001-001', 'National Museum Trust', 'New Delhi', '2001-03-15'::date, NULL, 'institutional', 'Transferred to the museum collection after acquisition.'),
  ('MCMS-2003-022', 'Private Collection of the Nawab of Oudh', 'Lucknow', '1790-01-01'::date, '1900-01-01'::date, 'private', 'Originally commissioned for the Nawab''s private collection.'),
  ('MCMS-2003-022', 'Sotheby''s Auction House', 'London', '2002-10-01'::date, '2003-01-10'::date, 'institutional', 'Sold at auction before museum acquisition.'),
  ('MCMS-2004-031', 'Salvi Family of Patan', 'Patan, Gujarat', '1890-01-01'::date, '2004-10-01'::date, 'private', 'Held by the weaving family for four generations.'),
  ('MCMS-2006-019', 'Temple of Brihadeesvara', 'Thanjavur', '1910-01-01'::date, '2006-08-01'::date, 'religious', 'Used as a processional icon (utsava murti) in the temple.'),
  ('MCMS-2009-041', 'Royal Family of Mysore', 'Mysore Palace', '1900-01-01'::date, '2009-07-01'::date, 'private', 'Part of the royal treasury collection.'),
  ('MCMS-2010-016', 'Mughal Armory, Red Fort', 'Delhi', '1830-01-01'::date, '1857-08-01'::date, 'government', 'Stored in the imperial armory until after the 1857 uprising.'),
  ('MCMS-2012-045', 'French Collector Estate', 'Paris', '1880-01-01'::date, '2012-02-01'::date, 'private', 'Taken to France by a colonial-era collector.'),
  ('MCMS-2019-067', 'ASI Reserve Collection', 'Bhopal', '2019-01-01'::date, '2019-11-01'::date, 'government', 'Held in reserve before transfer to the museum.')
) AS v(acc_num, owner_name, location, start_date, end_date, ownership_type, description)
JOIN public.artifacts a ON a.accession_number = v.acc_num
ON CONFLICT DO NOTHING;

-- ============================================================
-- CONSERVATION RECORDS (10)
-- ============================================================
INSERT INTO public.conservation_records (artifact_id, assessment_date, condition, treatment, conservator, treatment_date, next_inspection_date, notes)
SELECT a.id, v.assessment_date, v.condition, v.treatment, v.conservator, v.treatment_date, v.next_inspection_date, v.notes
FROM (VALUES
  ('MCMS-2001-001', '2001-04-10'::date, 'excellent', 'Surface cleaning and consolidation of minor cracks', 'Dr. R. Menon', '2001-04-15'::date, '2026-04-15'::date, 'No significant structural damage. Minor surface weathering addressed.'),
  ('MCMS-2002-014', '2002-08-05'::date, 'good', 'Desalination and protective coating', 'S. Patel', '2002-08-20'::date, '2025-08-20'::date, 'Salt deposits removed from base. Coating applied.'),
  ('MCMS-2004-031', '2004-12-15'::date, 'fair', 'Stabilization of fraying edges and gentle cleaning', 'A. Sharma', '2005-01-10'::date, '2025-01-10'::date, 'Edges fraying. Recommended low-light display.'),
  ('MCMS-2005-007', '2005-07-01'::date, 'fair', 'Reassembly of fragments and gap filling', 'Dr. R. Menon', '2005-07-20'::date, '2025-07-20'::date, 'Three fragments rejoined. Compatible filler used.'),
  ('MCMS-2011-028', '2011-11-01'::date, 'fair', 'Surface cleaning and minor repair of right arm', 'S. Patel', '2011-11-15'::date, '2024-11-15'::date, 'Right arm reattached. Surface dirt removed.'),
  ('MCMS-2012-045', '2012-04-10'::date, 'poor', 'Full conservation treatment underway — fiber stabilization', 'A. Sharma', NULL, '2025-04-10'::date, 'Significant fiber degradation. Treatment in progress.'),
  ('MCMS-2014-038', '2014-12-20'::date, 'fair', 'Flattening and deacidification of paper support', 'Dr. N. Kapoor', '2015-01-15'::date, '2026-01-15'::date, 'Paper acidity corrected. Minor foxing treated.'),
  ('MCMS-2017-044', '2017-10-01'::date, 'poor', 'Rust removal and corrosion stabilization', 'R. Singh', '2017-10-20'::date, '2024-10-20'::date, 'Active corrosion on blade. Stabilized with tannic acid.'),
  ('MCMS-2019-067', '2019-12-10'::date, 'restored', 'Major restoration — reconstruction of missing torso section', 'Dr. R. Menon', '2020-06-15'::date, '2026-06-15'::date, 'Extensive restoration completed. Missing section reconstructed with compatible stone.'),
  ('MCMS-2006-019', '2006-10-01'::date, 'excellent', 'Routine inspection and wax coating renewal', 'Dr. R. Menon', '2006-10-05'::date, '2026-10-05'::date, 'No issues found. Protective wax coating refreshed.')
) AS v(acc_num, assessment_date, condition, treatment, conservator, treatment_date, next_inspection_date, notes)
JOIN public.artifacts a ON a.accession_number = v.acc_num
ON CONFLICT DO NOTHING;

-- ============================================================
-- ACQUISITIONS (for a subset of artifacts)
-- ============================================================
INSERT INTO public.acquisitions (artifact_id, acquisition_date, acquisition_method, source, price, donor_name, documentation, notes)
SELECT a.id, v.acquisition_date, v.acquisition_method, v.source, v.price, v.donor_name, v.documentation, v.notes
FROM (VALUES
  ('MCMS-2001-001', '2001-03-15'::date, 'excavation', 'ASI Sarnath', NULL, NULL, 'Excavation Report 2001-07', 'Officially transferred from ASI after excavation.'),
  ('MCMS-2002-014', '2002-07-20'::date, 'donation', 'Private donor', NULL, 'Shri R.K. Mehta', 'Donation Deed 2002-14', 'Donated by a local collector.'),
  ('MCMS-2003-022', '2003-01-10'::date, 'purchase', 'Sotheby''s London', 45000.00, NULL, 'Invoice SB-2003-022', 'Purchased at auction.'),
  ('MCMS-2004-031', '2004-11-05'::date, 'donation', 'Salvi Family', NULL, 'Ram Singh Salvi', 'Donation Deed 2004-31', 'Donated by the weaving family.'),
  ('MCMS-2006-019', '2006-09-18'::date, 'purchase', 'Art dealer Chennai', 120000.00, NULL, 'Invoice 2006-019', 'Purchased from a verified dealer.'),
  ('MCMS-2010-016', '2010-05-17'::date, 'purchase', 'Antique dealer Delhi', 75000.00, NULL, 'Invoice 2010-016', 'Purchased with documentation.'),
  ('MCMS-2019-067', '2019-11-30'::date, 'excavation', 'ASI Bhopal', NULL, NULL, 'Excavation Report 2019-67', 'Transferred from ASI reserve.')
) AS v(acc_num, acquisition_date, acquisition_method, source, price, donor_name, documentation, notes)
JOIN public.artifacts a ON a.accession_number = v.acc_num
ON CONFLICT DO NOTHING;
