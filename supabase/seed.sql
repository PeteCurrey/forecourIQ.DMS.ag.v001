-- Hartwell Motor Group Demo Seed
-- Dealership ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890

insert into dealerships (
  id, name, slug, address_line1, city, county,
  postcode, phone, email, subscription_tier,
  subscription_status, trial_ends_at
) values (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Hartwell Motor Group',
  'hartwell',
  '47 Sheffield Road',
  'Chesterfield',
  'Derbyshire',
  'S41 7JH',
  '01246 555 0190',
  'enquiries@hartwellmotors.co.uk',
  'elite',
  'active',
  (now() + interval '365 days')
) on conflict (id) do nothing;

-- VEHICLES (35 Total)
-- 28 Available, 4 Reserved, 3 Sold

insert into vehicles (
  dealership_id, registration, make, model, variant, year, mileage, colour, fuel_type,
  transmission, body_type, doors, engine_size, mot_expiry, service_history, hpi_clear,
  condition, purchase_price, prep_cost, transport_cost, asking_price, status, description,
  highlights, published_autotrader, published_ebay
) values 
-- 01. BMW M4
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'DN21 XYZ', 'BMW', 'M4', 'Competition',
  2021, 18400, 'Frozen Black Metallic',
  'petrol', 'automatic', 'coupe', 2, '3.0L',
  '2025-09-15', 'full', true, 'excellent',
  52000, 850, 350, 59495, 'available',
  'Stunning BMW M4 Competition in rare Frozen Black Metallic. Factory M options including carbon ceramic brakes, M carbon bucket seats, and Harman Kardon sound system. Full BMW main dealer service history. One previous keeper.',
  ARRAY['Frozen Black Metallic — factory order colour', 'Carbon ceramic brakes', 'M carbon bucket seats', 'Harman Kardon sound system', 'Full BMW main dealer service history', 'One previous keeper'],
  true, true
),
-- 02. BMW 320d
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'LD70 AVK', 'BMW', '3 Series', '320d M Sport',
  2021, 24500, 'Portimao Blue',
  'diesel', 'automatic', 'saloon', 4, '2.0L',
  '2025-03-12', 'full', true, 'excellent',
  24000, 450, 250, 29950, 'available',
  'Highly desirable 320d M Sport in Portimao Blue. Featuring the M Sport Pro Package, Sun Protection Glass, and Live Cockpit Professional. Excellent fuel economy with 190bhp performance.',
  ARRAY['M Sport Pro Package', '19-inch Jet Black Alloy Wheels', 'Heated Front Seats', 'Reverse Camera', 'Apple CarPlay / Android Auto'],
  true, true
),
-- 03. Audi RS4
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'RK20 FLN', 'Audi', 'RS4', 'Avant TFSI Quattro',
  2020, 15800, 'Nardo Grey',
  'petrol', 'automatic', 'estate', 5, '2.9L',
  '2025-06-20', 'full', true, 'excellent',
  55000, 1200, 400, 62990, 'available',
  'Iconic RS4 Avant in Nardo Grey. RS Sports Exhaust, Comfort and Sound Pack, and 20-inch Flag Design wheels. The ultimate family estate with supercar performance.',
  ARRAY['Nardo Grey Paint', 'RS Sports Exhaust System', 'Bang & Olufsen 3D Sound', 'Extended LED Interior Lighting Pack', 'Quattro with Sports Differential'],
  true, true
),
-- 04. Porsche 911
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'LX69 PKO', 'Porsche', '911', 'Carrera S (992)',
  2019, 12200, 'Crayon',
  'petrol', 'automatic', 'coupe', 2, '3.0L',
  '2025-11-05', 'full', true, 'mint',
  82000, 600, 500, 94950, 'reserved',
  'Stunning 992 Carrera S in Crayon. High specification includes Sport Chrono Package, PASM, Bose Surround Sound, and Electric Slide/Tilt Glass Sunroof. Only 12k miles from new.',
  ARRAY['Crayon Special Paint', 'Sport Chrono Package', 'Electric Sunroof', 'Bose Surround Sound', '20/21-inch RS Spyder Wheels'],
  true, true
),
-- 05. Land Rover Defender
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'VO21 GTY', 'Land Rover', 'Defender', '110 D250 SE',
  2021, 28000, 'Pangea Green',
  'diesel', 'automatic', 'suv', 5, '3.0L',
  '2025-04-22', 'full', true, 'excellent',
  48000, 900, 400, 56995, 'available',
  'New model Defender 110 SE in signature Pangea Green. Black Pack, Privacy Glass, and 20-inch Gloss Black wheels. Exceptionally capable and luxurious.',
  ARRAY['Pangea Green Paint', 'Black Exterior Pack', 'Meridian Sound System', '3D Surround Camera', 'Adaptive Cruise Control'],
  true, true
),
-- 06. Mercedes-Benz E-Class
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'BN70 HUI', 'Mercedes-Benz', 'E-Class', 'E220d AMG Line Premium Plus',
  2020, 31000, 'Obsidian Black',
  'diesel', 'automatic', 'saloon', 4, '2.0L',
  '2025-02-18', 'full', true, 'excellent',
  26000, 500, 200, 31495, 'available',
  'Highest specification Premium Plus model. Burmester Sound, Panoramic Roof, Multibeam LED, and Memory Seats. One owner from new.',
  ARRAY['Premium Plus Package', 'Panoramic Glass Sunroof', 'Burmester Surround Sound', 'Multibeam LED Intelligent Light System', '360 Degree Camera'],
  true, true
),
-- 07. Audi Q7
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'YH20 JKL', 'Audi', 'Q7', '50 TDI Quattro S Line',
  2020, 35000, 'Daytona Grey',
  'diesel', 'automatic', 'suv', 5, '3.0L',
  '2025-07-30', 'full', true, 'good',
  36000, 1100, 300, 41995, 'available',
  'Practical 7-seater luxury SUV. S Line trim with Virtual Cockpit, Matrix LED Headlights, and Valcona Leather. Excellent towing and family capabilities.',
  ARRAY['Daytona Grey Pearl Effect', 'Virtual Cockpit', 'Matrix LED Headlights', 'Adaptive Air Suspension', 'Heated Rear Seats'],
  true, true
),
-- 08. BMW 530d
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'GV70 OPS', 'BMW', '5 Series', '530d M Sport xDrive',
  2020, 42000, 'Sophisto Grey',
  'diesel', 'automatic', 'saloon', 4, '3.0L',
  '2025-05-14', 'full', true, 'excellent',
  23500, 600, 250, 28450, 'available',
  'xDrive all-wheel drive stability paired with the powerful 3.0L diesel engine. M Sport trim with Technology Pack and Harman Kardon Sound.',
  ARRAY['xDrive All Wheel Drive', 'Technology Package', 'Harman Kardon Sound', 'Head-Up Display', 'Gesture Control'],
  true, true
),
-- 09. Mercedes-Benz GLE
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'ML20 PKI', 'Mercedes-Benz', 'GLE', 'GLE 350d 4Matic AMG Line',
  2020, 38500, 'Selenite Grey',
  'diesel', 'automatic', 'suv', 5, '3.0L',
  '2025-08-20', 'full', true, 'excellent',
  42000, 800, 400, 48995, 'available',
  'The ultimate luxury SUV. AMG Line styling with 20-inch wheels, MBUX Infotainment, and Blind Spot Assist. Spacious and powerful.',
  ARRAY['7 Seat Package', 'MBUX Multimedia System', 'Widescreen Cockpit', 'Blind Spot Assist', 'Running Boards'],
  true, true
),
-- 10. Porsche Cayenne
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'SK20 VNM', 'Porsche', 'Cayenne', 'Cayenne S',
  2020, 22000, 'Quartzite Grey',
  'petrol', 'automatic', 'suv', 5, '2.9L',
  '2025-09-10', 'full', true, 'excellent',
  58000, 1500, 500, 67990, 'available',
  'High performance Cayenne S. V6 Biturbo engine delivering 440bhp. Sport Design Pack, PASM, and 21-inch RS Spyder Wheels. Porsche performance in an SUV package.',
  ARRAY['Sport Design Package', '21-inch RS Spyder Wheels', 'Porsche Active Suspension Management', 'Panoramic Roof System', 'Comfort Access'],
  true, true
),
-- 11. Range Rover Sport
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'LO71 DFC', 'Land Rover', 'Range Rover Sport', 'D300 HSE Dynamic',
  2021, 25600, 'Carpathian Grey',
  'diesel', 'automatic', 'suv', 5, '3.0L',
  '2025-10-15', 'full', true, 'excellent',
  56000, 1000, 450, 64995, 'available',
  'HSE Dynamic trim with Black Pack. Carpathian Grey metallic paint, Panoramic Roof, and Matrix LED Headlights. The benchmark for luxury sports SUVs.',
  ARRAY['Carpathian Grey Premium Paint', 'Black Exterior Pack', 'Fixed Panoramic Roof', 'Matrix LED Headlights', 'Heated Steering Wheel'],
  true, true
),
-- 12. Audi RS6
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'RS21 PWR', 'Audi', 'RS6', 'Avant Carbon Black',
  2021, 14000, 'Mythos Black',
  'petrol', 'automatic', 'estate', 5, '4.0L',
  '2025-03-25', 'full', true, 'excellent',
  82000, 2000, 600, 92995, 'available',
  'The ultimate super-estate. Carbon Black edition with Carbon Exterior Pack, 22-inch wheels, and RS Sports Exhaust. Incredible presence and performance.',
  ARRAY['Carbon Black Styling Pack', '22-inch Gloss Black Wheels', 'RS Sports Exhaust', 'Red Brake Calipers', 'HD Matrix LED with Laser Light'],
  true, true
),
-- 13. Bentley Continental GT
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'B7 FLY', 'Bentley', 'Continental GT', 'V8 Mulliner Spec',
  2019, 18000, 'Sequin Blue',
  'petrol', 'automatic', 'coupe', 2, '4.0L',
  '2025-06-12', 'full', true, 'excellent',
  115000, 3000, 800, 134950, 'available',
  'Breathtaking Sequin Blue Continental GT. Mulliner Driving Specification with 22-inch wheels, Touring Specification, and City Specification. The pinnacle of Grand Touring.',
  ARRAY['Mulliner Driving Specification', '22-inch Polished Alloy Wheels', 'Touring Specification', 'Bentley Rotating Display', 'Contrast Stitching and Piping'],
  true, true
),
-- 14. Aston Martin Vantage
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'AM20 VNT', 'Aston Martin', 'Vantage', 'V8 Auto',
  2020, 11500, 'China Grey',
  'petrol', 'automatic', 'coupe', 2, '4.0L',
  '2025-09-05', 'full', true, 'excellent',
  78000, 1800, 500, 89950, 'available',
  'Stunning Vantage in China Grey. Sports Plus Pack, 20-inch wheels, and Yellow Brake Calipers. Powered by the incredible AMG-sourced V8.',
  ARRAY['China Grey Paint', 'Sports Plus Pack', 'Exterior Black Pack', 'Yellow Brake Calipers', 'Machined Carbon Fibre Wings Badge'],
  true, true
),
-- 15. BMW X5
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'NX21 ABC', 'BMW', 'X5', 'xDrive40d M Sport',
  2021, 32000, 'Mineral White',
  'diesel', 'automatic', 'suv', 5, '3.0L',
  '2025-04-10', 'full', true, 'excellent',
  42000, 850, 350, 49950, 'available',
  'Mineral White X5 with Black Vernasca Leather. Sky Lounge Panoramic Roof, M Sport Exhaust, and Comfort Access. One owner, full BMW history.',
  ARRAY['Sky Lounge Panoramic Roof', 'M Sport Pro Pack', 'Comfort Access', 'Laserlights', 'Heated & Cooled Cupholders'],
  true, true
),
-- 16. Audi A6
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'FG71 TYU', 'Audi', 'A6', '40 TDI Black Edition',
  2021, 26000, 'Firmament Blue',
  'diesel', 'automatic', 'saloon', 4, '2.0L',
  '2025-08-22', 'full', true, 'excellent',
  26500, 400, 200, 31950, 'available',
  'Sophisticated Black Edition A6. Matrix LED, Black Styling Pack, and 20-inch wheels. Impeccable condition throughout.',
  ARRAY['Black Styling Pack', 'Matrix LED Headlights', '20-inch V-Spoke Alloys', 'Flat Bottom Steering Wheel', 'Privacy Glass'],
  true, true
),
-- 17. Mercedes-Benz C-Class
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'HG21 CVB', 'Mercedes-Benz', 'C-Class', 'C43 AMG 4Matic',
  2021, 19500, 'Iridium Silver',
  'petrol', 'automatic', 'coupe', 2, '3.0L',
  '2025-03-30', 'full', true, 'excellent',
  34000, 700, 300, 39995, 'available',
  'V6 Biturbo C43 AMG. AMG Performance Exhaust, Night Edition styling, and Premium Plus Pack. The perfect blend of performance and daily usability.',
  ARRAY['AMG Performance Exhaust', 'Night Edition Package', 'Premium Plus Pack', 'Burmester Sound', 'Wireless Charging'],
  true, true
),
-- 18. Porsche Macan
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'PO21 MAC', 'Porsche', 'Macan', 'Macan S',
  2021, 24000, 'Volcano Grey',
  'petrol', 'automatic', 'suv', 5, '2.9L',
  '2025-05-15', 'full', true, 'excellent',
  46000, 1100, 400, 52950, 'available',
  'Fast and agile Macan S. Updated 2.9L engine. Sports Chrono Pack, Panoramic Roof, and 21-inch RS Spyder wheels. Full Porsche service history.',
  ARRAY['Sport Chrono Package', 'Panoramic Glass Roof', '21-inch RS Spyder Wheels', 'PASM', 'Heated Steering Wheel'],
  true, true
),
-- 19. Bentley Bentayga
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'B20 FLY', 'Bentley', 'Bentayga', 'V8 First Edition',
  2020, 29000, 'Beluga Black',
  'petrol', 'automatic', 'suv', 5, '4.0L',
  '2025-07-20', 'full', true, 'excellent',
  95000, 2500, 600, 109950, 'available',
  'First Edition Bentayga in Beluga Black. Naim for Bentley sound system, Rear Seat Entertainment, and 22-inch Five Spoke wheels. Pure luxury.',
  ARRAY['First Edition Package', 'Naim for Bentley Audio', 'Rear Seat Entertainment', 'Bentley Dynamic Ride', 'Mulliner Comfort Specification'],
  true, true
),
-- 20. Land Rover Discovery
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'DX20 MKO', 'Land Rover', 'Discovery', 'D300 HSE',
  2020, 45000, 'Santorini Black',
  'diesel', 'automatic', 'suv', 5, '3.0L',
  '2025-06-05', 'full', true, 'good',
  34000, 1200, 300, 39950, 'available',
  'Discovery HSE in Santorini Black. Full 7-seater with Meridian sound, Panoramic Sunroof, and heated seats all round. Versatile family adventure vehicle.',
  ARRAY['Twin Speed Transfer Box', 'Meridian Sound System', 'Fixed Panoramic Roof', 'Matrix LED Headlights', 'Electronic Air Suspension'],
  true, true
),
-- 21. BMW 8 Series
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'BM20 GRN', 'BMW', '8 Series', '840i M Sport',
  2020, 21000, 'Barcelona Blue',
  'petrol', 'automatic', 'coupe', 2, '3.0L',
  '2025-09-25', 'full', true, 'excellent',
  35000, 600, 300, 39995, 'available',
  'Stunning 8 Series Coupe. Barcelona Blue with Ivory White Merino Leather. Technology Pack, Premium Pack, and M Sport Pro Pack.',
  ARRAY['Technology Package', 'Premium Package', 'M Sport Pro Package', 'Glass Clarity Controls', 'Laserlights'],
  true, true
),
-- 22. Audi Q5
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'AQ21 TYR', 'Audi', 'Q5', '40 TDI S Line Quattro',
  2021, 22500, 'Navarra Blue',
  'diesel', 'automatic', 'suv', 5, '2.0L',
  '2025-10-12', 'full', true, 'excellent',
  29000, 500, 250, 33950, 'available',
  'Popular Q5 S Line in Navarra Blue. Virtual Cockpit, Reverse Camera, and Power Tailgate. Clean, efficient, and refined.',
  ARRAY['Virtual Cockpit Plus', 'Reverse Camera', 'LED Headlights', 'Power Tailgate', 'Heated Seats'],
  true, true
),
-- 23. Mercedes-Benz A-Class
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'AM21 GTR', 'Mercedes-Benz', 'A-Class', 'A35 AMG 4Matic Premium',
  2021, 15000, 'Digital White',
  'petrol', 'automatic', 'hatchback', 5, '2.0L',
  '2025-03-10', 'full', true, 'excellent',
  26000, 450, 200, 29995, 'available',
  'A35 AMG Premium in Digital White. Advanced navigation, MBUX system, and AMG styling pack. Great hot-hatch performance.',
  ARRAY['AMG Styling Package', 'MBUX Navigation', 'Widescreen Cockpit', 'Ambient Lighting', 'Reverse Camera'],
  true, true
),
-- 24. Porsche Panamera
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'PA20 TUR', 'Porsche', 'Panamera', 'Panamera 4S',
  2020, 27000, 'Jet Black',
  'petrol', 'automatic', 'saloon', 4, '2.9L',
  '2025-05-30', 'full', true, 'excellent',
  52000, 1400, 400, 59995, 'available',
  'Luxury and performance combined. Panamera 4S with Sport Chrono, Air Suspension, and Bose Sound. Full Porsche history.',
  ARRAY['Sport Chrono Package', 'Adaptive Air Suspension', 'Bose Surround Sound', 'Soft Close Doors', '14-Way Comfort Seats'],
  true, true
),
-- 25. BMW 1 Series
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'BM21 ONE', 'BMW', '1 Series', '118i M Sport',
  2021, 18500, 'Storm Bay',
  'petrol', 'automatic', 'hatchback', 5, '1.5L',
  '2025-08-15', 'full', true, 'excellent',
  18000, 350, 150, 21950, 'available',
  'Modern 1 Series in desirable Storm Bay. M Sport trim with Live Cockpit Pro and LED headlights. Efficient and stylish.',
  ARRAY['M Sport Package', 'Live Cockpit Professional', 'LED Headlights', 'Front & Rear Sensors', 'Heated Front Seats'],
  true, true
),
-- 26. Audi RS5
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'RS20 COU', 'Audi', 'RS5', 'Coupe TFSI Quattro',
  2020, 19000, 'Misano Red',
  'petrol', 'automatic', 'coupe', 2, '2.9L',
  '2025-02-28', 'full', true, 'excellent',
  46000, 900, 350, 51995, 'available',
  'Striking Misano Red RS5. Comfort and Sound Pack, RS Sports Exhaust, and 20-inch Trapezoid wheels. Incredible acceleration.',
  ARRAY['Misano Red Paint', 'Bang & Olufsen 3D Sound', 'RS Sports Exhaust', 'Pneumatic Massage Seats', 'Matrix LED Headlights'],
  true, true
),
-- 27. Mercedes-Benz G-Class (Extra)
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'G63 AMG', 'Mercedes-Benz', 'G-Class', 'G63 AMG Magno',
  2021, 12000, 'Night Black Magno',
  'petrol', 'automatic', 'suv', 5, '4.0L',
  '2025-11-20', 'full', true, 'mint',
  135000, 2000, 1000, 154995, 'available',
  'Rare Night Black Magno G63. G-Manufaktur Interior, Night Pack, and 22-inch wheels. The ultimate luxury off-roader.',
  ARRAY['G-Manufaktur Interior', 'AMG Night Package', '22-inch Cross Spoke Alloys', 'Burmester Surround Sound', 'Sunroof'],
  true, true
),
-- 28. BMW M3
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'M30 COMPETITION', 'BMW', 'M3', 'Competition xDrive',
  2022, 9500, 'Isle of Man Green',
  'petrol', 'automatic', 'saloon', 4, '3.0L',
  '2026-03-15', 'full', true, 'mint',
  64000, 1000, 400, 72995, 'available',
  'Current model M3 Competition xDrive in Isle of Man Green. Kyalami Orange interior. M Carbon Pack and Technology Pack.',
  ARRAY['Isle of Man Green Paint', 'M Carbon Exterior Pack', 'xDrive All Wheel Drive', 'Laserlights', 'Head-Up Display'],
  true, true
),
-- 29. Sold Example 1
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'LR70 SOLD', 'Land Rover', 'Defender', '90 D200',
  2020, 32000, 'Eiger Grey',
  'diesel', 'automatic', 'suv', 3, '3.0L',
  '2024-05-15', 'full', true, 'good',
  38000, 1200, 400, 44950, 'sold',
  'Sold vehicle for analytics. Defender 90 in Eiger Grey.',
  ARRAY['Tow Pack', 'Cold Climate Pack'],
  true, true
),
-- 30. Sold Example 2
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'BM68 SOLD', 'BMW', 'X3', 'xDrive20d M Sport',
  2018, 54000, 'Black Sapphire',
  'diesel', 'automatic', 'suv', 5, '2.0L',
  '2024-03-20', 'full', true, 'good',
  16500, 600, 200, 20950, 'sold',
  'Sold vehicle for analytics. BMW X3.',
  ARRAY['M Sport Pro Pack'],
  true, true
),
-- 31. Sold Example 3
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'AU69 SOLD', 'Audi', 'A3', 'S3 Sportback',
  2019, 28000, 'Ara Blue',
  'petrol', 'automatic', 'hatchback', 5, '2.0L',
  '2024-06-10', 'full', true, 'excellent',
  24000, 800, 200, 28950, 'sold',
  'Sold vehicle for analytics. Audi S3.',
  ARRAY['Bang & Olufsen Sound'],
  true, true
),
-- 32. Reserved Example 1
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'ME21 RES', 'Mercedes-Benz', 'CLA', 'CLA 220d AMG Line',
  2021, 21000, 'Mountain Grey',
  'diesel', 'automatic', 'coupe', 4, '2.0L',
  '2025-04-12', 'full', true, 'excellent',
  24500, 400, 200, 28495, 'reserved',
  'Reserved for Mr. Henderson.',
  ARRAY['Night Pack'],
  true, true
),
-- 33. Reserved Example 2
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'BM21 RES', 'BMW', '4 Series', '420i M Sport',
  2021, 15400, 'San Remo Green',
  'petrol', 'automatic', 'coupe', 2, '2.0L',
  '2025-07-30', 'full', true, 'excellent',
  29000, 500, 200, 33950, 'reserved',
  'Reserved for Ms. Davies.',
  ARRAY['Pro Pack'],
  true, true
),
-- 34. Reserved Example 3
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'AU21 RES', 'Audi', 'A4', '35 TFSI S Line',
  2021, 18900, 'Mythos Black',
  'petrol', 'automatic', 'saloon', 4, '2.0L',
  '2025-05-15', 'full', true, 'excellent',
  21500, 300, 150, 24995, 'reserved',
  'Reserved for Mr. Thompson.',
  ARRAY['Virtual Cockpit'],
  true, true
),
-- 35. Available Fill
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'NX21 YHN', 'Audi', 'A1', '30 TFSI S Line',
  2021, 12500, 'Python Yellow',
  'petrol', 'manual', 'hatchback', 5, '1.0L',
  '2025-11-10', 'full', true, 'excellent',
  14500, 300, 150, 17995, 'available',
  'Python Yellow Audi A1. Great first car or city runaround.',
  ARRAY['S Line Pack'],
  true, true
);

-- LEADS (24 Total)
insert into leads (
  dealership_id, first_name, last_name, email, phone, source, status, message, finance_interest, created_at
) values
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'James', 'Wilson', 'james.wilson@email.com', '07712 345678', 'website', 'new', 'Interested in the BMW M4. Is it available for a viewing tomorrow?', true, now() - interval '1 hour'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Sarah', 'Thompson', 's.thompson@email.com', '07812 456789', 'autotrader', 'contacted', 'Does the RS4 have a sunroof?', false, now() - interval '5 hours'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Robert', 'Harris', 'rob.harris@email.com', '07912 567890', 'ebay', 'test_drive', 'Great spec on the Defender.', true, now() - interval '1 day'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Emily', 'Davis', 'emily.d@email.com', '07734 678901', 'website', 'offer', 'Offered £92k for the 911.', true, now() - interval '2 days'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Michael', 'Brown', 'm.brown@email.com', '07834 789012', 'phone', 'new', 'Enquired about part-ex for a 2018 BMW X3.', false, now() - interval '3 hours'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Jessica', 'Taylor', 'jess.t@email.com', '07934 890123', 'walkin', 'contacted', 'Looking for a family SUV.', false, now() - interval '4 hours'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'David', 'Miller', 'd.miller@email.com', '07756 901234', 'website', 'won', 'Purchased the Discovery.', true, now() - interval '10 days'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Olivia', 'Moore', 'o.moore@email.com', '07856 012345', 'autotrader', 'lost', 'Too expensive.', false, now() - interval '12 days'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'William', 'Anderson', 'w.anderson@email.com', '07956 123456', 'ebay', 'new', 'Is the Bentley Continental still available?', true, now() - interval '2 hours'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Sophia', 'Thomas', 's.thomas@email.com', '07778 234567', 'website', 'contacted', 'Wants to see the GLE on Saturday.', true, now() - interval '6 hours'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Daniel', 'Jackson', 'd.jackson@email.com', '07878 345678', 'phone', 'test_drive', 'Testing the Aston Martin today.', false, now() - interval '8 hours'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Isabella', 'White', 'i.white@email.com', '07978 456789', 'walkin', 'offer', 'Offered £48k for the Range Rover.', true, now() - interval '1 day'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Luke', 'Skywalker', 'luke@tatooine.com', '07123 456789', 'website', 'new', 'Interested in the X5.', true, now() - interval '30 mins'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Han', 'Solo', 'han@falcon.com', '07123 987654', 'autotrader', 'new', 'Trade in my Falcon for the RS6?', false, now() - interval '45 mins'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Leia', 'Organa', 'leia@alderaan.com', '07222 333444', 'website', 'contacted', 'Luxury SUV search.', true, now() - interval '2 hours'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Peter', 'Parker', 'spidey@nyc.com', '07333 444555', 'phone', 'test_drive', 'Testing the Audi A6.', false, now() - interval '3 hours'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Bruce', 'Wayne', 'batman@gotham.com', '07444 555666', 'walkin', 'won', 'Bought the Bentley. Cash.', false, now() - interval '5 days'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Clark', 'Kent', 'superman@metropolis.com', '07555 666777', 'website', 'lost', 'Bought elsewhere.', false, now() - interval '7 days'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Tony', 'Stark', 'ironman@stark.com', '07666 777888', 'ebay', 'new', 'Looking for the fastest Audi.', true, now() - interval '15 mins'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Steve', 'Rogers', 'cap@avengers.com', '07777 888999', 'website', 'contacted', 'Classic feeling modern cars.', false, now() - interval '1 hour'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Natasha', 'Romanoff', 'widow@kgb.com', '07888 999000', 'phone', 'test_drive', 'Audi Q5 test drive.', true, now() - interval '4 hours'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Wanda', 'Maximoff', 'scarlet@witch.com', '07999 000111', 'walkin', 'offer', 'A35 AMG offer.', true, now() - interval '6 hours'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Thor', 'Odinson', 'thor@asgard.com', '07111 222333', 'website', 'won', 'Purchased M3 Competition.', false, now() - interval '3 days'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Loki', 'Laufeyson', 'mischief@asgard.com', '07222 333444', 'autotrader', 'lost', 'Decided on a different color.', false, now() - interval '4 days');

-- BUYING SIGNALS (8 Total)
insert into buying_signals (
  dealership_id, make, model, year_min, year_max, fuel_type, mileage_max, target_buy_price, 
  projected_retail, projected_margin, days_to_sell_estimate, demand_score, reasoning
) values
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'BMW', 'M3', 2021, 2023, 'petrol', 15000, 62000, 68995, 6995, 18, 94, 'High regional search volume for M3 Competition G80. Your last M-car sold in under 12 days.'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Audi', 'Q7', 2020, 2022, 'diesel', 40000, 38000, 43995, 5995, 24, 88, 'Family SUV demand in Derbyshire is up 15%. Stock turn for 7-seaters is currently at a 6-month high.'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Porsche', '911', 2018, 2021, 'petrol', 20000, 85000, 93995, 8995, 21, 92, '992 generation models are holding strong value. Low supply in the East Midlands for Crayon and Shark Blue examples.'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Land Rover', 'Defender', 2020, 2023, 'diesel', 30000, 48000, 54995, 6995, 22, 90, 'Defender 110 resale values remain resilient. High interest in Black Pack and Urban Automotive styling.'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Mercedes-Benz', 'E-Class', 2020, 2022, 'diesel', 45000, 24000, 28995, 4995, 28, 76, 'Stable demand for Premium Plus models. Good consistent margin potential for business-use buyers.'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Audi', 'RS6', 2020, 2022, 'petrol', 25000, 78000, 87995, 9995, 19, 85, 'Extreme performance estate demand remains constant for well-specced Carbon Black or Vorsprung editions.'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Bentley', 'Continental', 2018, 2020, 'petrol', 20000, 105000, 119995, 14995, 35, 82, 'V8 models are turning faster than W12s. Sequin Blue and Hallmark Grey are top performing colors.'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'BMW', 'X5', 2019, 2022, 'diesel', 50000, 36000, 41995, 5995, 26, 80, 'Reliable stock for your profile. 40d engines are preferred over 30d in the current used market.');

-- MARKET DATA (20 Total)
insert into market_data (
  dealership_id, make, model, fuel_type, region, avg_asking_price, avg_days_to_sell, total_listings, demand_score
) values
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'BMW', '3 Series', 'diesel', 'East Midlands', 24500, 26, 145, 78),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'BMW', 'M4', 'petrol', 'East Midlands', 58995, 19, 12, 92),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Audi', 'RS4', 'petrol', 'East Midlands', 61500, 22, 8, 89),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Porsche', '911', 'petrol', 'East Midlands', 92000, 18, 15, 95),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Land Rover', 'Defender', 'diesel', 'East Midlands', 53500, 20, 42, 90),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Mercedes-Benz', 'E-Class', 'diesel', 'East Midlands', 27950, 30, 88, 72),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Audi', 'Q7', 'diesel', 'East Midlands', 41000, 25, 34, 85),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'BMW', '5 Series', 'diesel', 'East Midlands', 26500, 28, 92, 70),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Mercedes-Benz', 'GLE', 'diesel', 'East Midlands', 47500, 24, 28, 83),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Porsche', 'Cayenne', 'petrol', 'East Midlands', 65995, 21, 22, 88),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Land Rover', 'Range Rover Sport', 'diesel', 'East Midlands', 63000, 22, 38, 91),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Audi', 'RS6', 'petrol', 'East Midlands', 91500, 20, 6, 94),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Bentley', 'Continental', 'petrol', 'East Midlands', 132000, 32, 10, 81),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Aston Martin', 'Vantage', 'petrol', 'East Midlands', 88500, 28, 12, 84),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'BMW', 'X5', 'diesel', 'East Midlands', 48995, 23, 52, 86),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Audi', 'A6', 'diesel', 'East Midlands', 29500, 32, 65, 68),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Mercedes-Benz', 'C-Class', 'petrol', 'East Midlands', 38995, 25, 48, 79),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Porsche', 'Macan', 'petrol', 'East Midlands', 51500, 19, 25, 93),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Bentley', 'Bentayga', 'petrol', 'East Midlands', 108000, 35, 8, 78),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Land Rover', 'Discovery', 'diesel', 'East Midlands', 38500, 29, 44, 75);

-- ACTIVITIES (40 Total)
insert into activities (dealership_id, lead_id, type, content, created_at)
select 
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  id,
  case when (random() > 0.5) then 'call' else 'email' end,
  case 
    when (random() > 0.8) then 'Left voicemail regarding interest.'
    when (random() > 0.6) then 'Discussed part-ex valuation over phone.'
    when (random() > 0.4) then 'Sent finance breakdown via email.'
    else 'Customer confirmed they will visit this weekend.'
  end,
  now() - (random() * interval '10 days')
from leads limit 40;

-- Additional specific notes
insert into activities (dealership_id, lead_id, type, content, created_at)
values
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', (select id from leads order by created_at desc limit 1), 'note', 'Customer is very keen on Isle of Man Green, wants to ensure interior is Kyalami Orange.', now() - interval '5 mins'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', (select id from leads order by created_at desc limit 1 offset 1), 'test_drive', 'Completed test drive. Customer loved the exhaust note on the RS6.', now() - interval '2 hours'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', (select id from leads order by created_at desc limit 1 offset 2), 'offer', 'Offer received: £88,500. Margin remains healthy at £8.5k.', now() - interval '4 hours');
