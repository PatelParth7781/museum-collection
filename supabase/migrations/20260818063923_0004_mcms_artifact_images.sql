/*
# MCMS Artifact Images & Exhibition Covers

Populates the artifact_images table with real stock photos for all 20 seeded artifacts,
and adds cover images for the 4 exhibitions.

## What This Does
- Inserts 1-2 image records per artifact (primary + optional secondary)
- Each image_url references a Pexels stock photo URL
- Sets is_primary = true for the first image of each artifact
- Updates exhibition cover_image_url for all 4 exhibitions

## Notes
- Uses ON CONFLICT to be idempotent (safe to re-run)
- Images are stored as URLs in artifact_images, not as binary data in PostgreSQL
*/

-- ============================================================
-- ARTIFACT IMAGES
-- ============================================================
INSERT INTO public.artifact_images (artifact_id, image_url, caption, is_primary)
SELECT a.id, v.image_url, v.caption, v.is_primary
FROM (VALUES
  -- 1. Sandstone Buddha Head
  ('MCMS-2001-001', 'https://images.pexels.com/photos/38017915/pexels-photo-38017915.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Detailed close-up of the serene stone face', true),
  ('MCMS-2001-001', 'https://images.pexels.com/photos/30695044/pexels-photo-30695044.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Buddha sculpture on display', false),
  -- 2. Ashokan Pillar Capital
  ('MCMS-2002-014', 'https://images.pexels.com/photos/34318485/pexels-photo-34318485.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Ancient sculptures from the Mauryan period', true),
  -- 3. Mughal Miniature: Court Scene
  ('MCMS-2003-022', 'https://images.pexels.com/photos/38948167/pexels-photo-38948167.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Intricate Mughal-era frescoes and patterns', true),
  ('MCMS-2003-022', 'https://images.pexels.com/photos/34669489/pexels-photo-34669489.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Floral and geometric patterns characteristic of Mughal art', false),
  -- 4. Patola Silk Sari
  ('MCMS-2004-031', 'https://images.pexels.com/photos/10317127/pexels-photo-10317127.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Traditional Indian silk fabrics with rich patterns', true),
  -- 5. Harappan Painted Jar
  ('MCMS-2005-007', 'https://images.pexels.com/photos/12785140/pexels-photo-12785140.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Terracotta pottery similar to Harappan ware', true),
  -- 6. Bronze Nataraja
  ('MCMS-2006-019', 'https://images.pexels.com/photos/6593890/pexels-photo-6593890.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Bronze Nataraja statue depicting cosmic dance', true),
  ('MCMS-2006-019', 'https://images.pexels.com/photos/10899308/pexels-photo-10899308.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Detailed bronze sculpture of Hindu deity', false),
  -- 7. Illuminated Manuscript Page
  ('MCMS-2007-025', 'https://images.pexels.com/photos/30019470/pexels-photo-30019470.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Ancient manuscript with calligraphic text', true),
  ('MCMS-2007-025', 'https://images.pexels.com/photos/12347306/pexels-photo-12347306.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Historical calligraphy on parchment', false),
  -- 8. Bidriware Hookah Base
  ('MCMS-2008-033', 'https://images.pexels.com/photos/34113998/pexels-photo-34113998.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Detailed metalwork with intricate craftsmanship', true),
  -- 9. Gold Temple Jewelry Set
  ('MCMS-2009-041', 'https://images.pexels.com/photos/37485307/pexels-photo-37485307.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Golden ornaments with intricate designs', true),
  ('MCMS-2009-041', 'https://images.pexels.com/photos/1162983/pexels-photo-1162983.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Traditional Indian jewelry display', false),
  -- 10. Mughal Shamshir Sword
  ('MCMS-2010-016', 'https://images.pexels.com/photos/31350049/pexels-photo-31350049.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Ornate historical sword with detailed hilt', true),
  ('MCMS-2010-016', 'https://images.pexels.com/photos/33548606/pexels-photo-33548606.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Sword blade showcasing craftsmanship', false),
  -- 11. Terracotta Mother Goddess Figurine
  ('MCMS-2011-028', 'https://images.pexels.com/photos/10504668/pexels-photo-10504668.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Terracotta figurines in display setting', true),
  ('MCMS-2011-028', 'https://images.pexels.com/photos/14734823/pexels-photo-14734823.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Clay artifact with warm lighting', false),
  -- 12. Kashmir Shawl Fragment
  ('MCMS-2012-045', 'https://images.pexels.com/photos/32673642/pexels-photo-32673642.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Traditional Indian textile weaving', true),
  ('MCMS-2012-045', 'https://images.pexels.com/photos/38556299/pexels-photo-38556299.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Indian artisan crafting textiles', false),
  -- 13. Copper Plate Inscription
  ('MCMS-2013-052', 'https://images.pexels.com/photos/7386039/pexels-photo-7386039.png?auto=compress&cs=tinysrgb&w=1200', 'Ancient inscriptions on metal surface', true),
  ('MCMS-2013-052', 'https://images.pexels.com/photos/12347306/pexels-photo-12347306.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Historical calligraphy detail', false),
  -- 14. Dakhni Miniature: Hawa Mahal
  ('MCMS-2014-038', 'https://images.pexels.com/photos/30673013/pexels-photo-30673013.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Floral patterns on palace architecture', true),
  ('MCMS-2014-038', 'https://images.pexels.com/photos/34669489/pexels-photo-34669489.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Geometric patterns from Rajasthan', false),
  -- 15. Indus Seal with Unicorn
  ('MCMS-2015-061', 'https://images.pexels.com/photos/14734823/pexels-photo-14734823.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Small clay artifact in display niche', true),
  ('MCMS-2015-061', 'https://images.pexels.com/photos/12785140/pexels-photo-12785140.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Terracotta items similar to Indus Valley finds', false),
  -- 16. Gujarati Embroidered Wall Hanging
  ('MCMS-2016-029', 'https://images.pexels.com/photos/38556299/pexels-photo-38556299.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Indian artisan working on textiles', true),
  ('MCMS-2016-029', 'https://images.pexels.com/photos/10317127/pexels-photo-10317127.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Colorful traditional fabrics with patterns', false),
  -- 17. Iron Battle Axe
  ('MCMS-2017-044', 'https://images.pexels.com/photos/33548606/pexels-photo-33548606.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Historical weapon on display', true),
  ('MCMS-2017-044', 'https://images.pexels.com/photos/7540069/pexels-photo-7540069.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Ornate daggers with detailed engravings', false),
  -- 18. Silver Ritual Vessel
  ('MCMS-2018-050', 'https://images.pexels.com/photos/10899308/pexels-photo-10899308.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Metalwork vessel with intricate detail', true),
  ('MCMS-2018-050', 'https://images.pexels.com/photos/34113998/pexels-photo-34113998.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Bronze and metal ritual objects', false),
  -- 19. Stone Yakshi Sculpture
  ('MCMS-2019-067', 'https://images.pexels.com/photos/30695044/pexels-photo-30695044.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Ancient stone sculpture display', true),
  ('MCMS-2019-067', 'https://images.pexels.com/photos/34318485/pexels-photo-34318485.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Historical sculptures from ancient India', false),
  -- 20. Miniature: Royal Elephant Procession
  ('MCMS-2020-073', 'https://images.pexels.com/photos/38948167/pexels-photo-38948167.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Mughal-era artistic depiction', true),
  ('MCMS-2020-073', 'https://images.pexels.com/photos/30673013/pexels-photo-30673013.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Detailed patterns from royal architecture', false)
) AS v(acc_num, image_url, caption, is_primary)
JOIN public.artifacts a ON a.accession_number = v.acc_num
WHERE NOT EXISTS (
  SELECT 1 FROM public.artifact_images ai
  WHERE ai.artifact_id = a.id AND ai.image_url = v.image_url
);

-- ============================================================
-- EXHIBITION COVER IMAGES
-- ============================================================
UPDATE public.exhibitions SET cover_image_url = 'https://images.pexels.com/photos/35870230/pexels-photo-35870230.jpeg?auto=compress&cs=tinysrgb&w=1200'
WHERE name = 'Echoes of the Ancients' AND cover_image_url IS NULL;

UPDATE public.exhibitions SET cover_image_url = 'https://images.pexels.com/photos/30311891/pexels-photo-30311891.jpeg?auto=compress&cs=tinysrgb&w=1200'
WHERE name = 'Mughal Splendor: Art of the Court' AND cover_image_url IS NULL;

UPDATE public.exhibitions SET cover_image_url = 'https://images.pexels.com/photos/29608796/pexels-photo-29608796.jpeg?auto=compress&cs=tinysrgb&w=1200'
WHERE name = 'Threads of Time: Indian Textiles' AND cover_image_url IS NULL;

UPDATE public.exhibitions SET cover_image_url = 'https://images.pexels.com/photos/35870230/pexels-photo-35870230.jpeg?auto=compress&cs=tinysrgb&w=1200'
WHERE name = 'Sacred Metal: Ritual Bronzes of South India' AND cover_image_url IS NULL;
