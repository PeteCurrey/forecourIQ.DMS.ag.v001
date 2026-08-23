/**
 * Curated high-resolution editorial automotive photography library for luxury/sports/executive vehicles.
 * Provides realistic vehicle photography mapped deterministically by make, model, and vehicle segment.
 */

const VEHICLE_IMAGE_MAP: Record<string, string> = {
  // BMW
  'bmw-m4': 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1000&q=80',
  'bmw-m3': 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1000&q=80',
  'bmw-3 series': 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1000&q=80',
  'bmw-5 series': 'https://images.unsplash.com/photo-1556189250-72ba954cfc2b?auto=format&fit=crop&w=1000&q=80',
  'bmw-x5': 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1000&q=80',
  'bmw-x3': 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1000&q=80',
  'bmw-1 series': 'https://images.unsplash.com/photo-1556189250-72ba954cfc2b?auto=format&fit=crop&w=1000&q=80',
  'bmw-4 series': 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1000&q=80',
  
  // Audi
  'audi-rs4': 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&w=1000&q=80',
  'audi-rs6': 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&w=1000&q=80',
  'audi-rs5': 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1000&q=80',
  'audi-a4': 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1000&q=80',
  'audi-a6': 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&w=1000&q=80',
  'audi-q7': 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=1000&q=80',
  'audi-q5': 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=1000&q=80',
  'audi-a3': 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1000&q=80',
  'audi-a1': 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1000&q=80',
  
  // Porsche
  'porsche-911': 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=80',
  'porsche-cayenne': 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=1000&q=80',
  'porsche-macan': 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=1000&q=80',
  'porsche-panamera': 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=80',
  'porsche-taycan': 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=1000&q=80',

  // Land Rover / Range Rover
  'land rover-defender': 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1000&q=80',
  'land rover-discovery': 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1000&q=80',
  'land rover-range rover': 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1000&q=80',
  'land rover-range rover sport': 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1000&q=80',
  'range rover-sport': 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1000&q=80',
  'range rover-range rover': 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1000&q=80',

  // Mercedes-Benz
  'mercedes-benz-e-class': 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1000&q=80',
  'mercedes-benz-c-class': 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1000&q=80',
  'mercedes-benz-a-class': 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1000&q=80',
  'mercedes-benz-g-class': 'https://images.unsplash.com/photo-1520050206274-a1ae44613e6d?auto=format&fit=crop&w=1000&q=80',
  'mercedes-benz-gle': 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1000&q=80',
  'mercedes-benz-cla': 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1000&q=80',

  // Volkswagen
  'volkswagen-golf r': 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1000&q=80',
  'volkswagen-golf': 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1000&q=80',
  'volkswagen-tiguan': 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1000&q=80',

  // Bentley
  'bentley-continental': 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1000&q=80',
  'bentley-bentayga': 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1000&q=80',

  // Aston Martin
  'aston martin-vantage': 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=80',
};

// Generic segment fallbacks
const SEGMENT_FALLBACKS: Record<string, string> = {
  suv: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1000&q=80',
  coupe: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1000&q=80',
  saloon: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1000&q=80',
  estate: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&w=1000&q=80',
  hatchback: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1000&q=80',
  default: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1000&q=80',
};

/**
 * Deterministically returns a high-resolution authentic vehicle image for a given vehicle make/model/body type.
 */
export function getVehicleFallbackImage(make?: string | null, model?: string | null, bodyType?: string | null): string {
  if (!make && !model) return SEGMENT_FALLBACKS.default;

  const makeStr = (make || '').toLowerCase().trim();
  const modelStr = (model || '').toLowerCase().trim();
  const key = `${makeStr}-${modelStr}`;

  // Direct match
  if (VEHICLE_IMAGE_MAP[key]) return VEHICLE_IMAGE_MAP[key];

  // Partial model match
  for (const [mapKey, url] of Object.entries(VEHICLE_IMAGE_MAP)) {
    if (mapKey.startsWith(`${makeStr}-`) && (modelStr.includes(mapKey.replace(`${makeStr}-`, '')) || mapKey.includes(modelStr))) {
      return url;
    }
  }

  // Make only fallback
  for (const [mapKey, url] of Object.entries(VEHICLE_IMAGE_MAP)) {
    if (mapKey.startsWith(`${makeStr}-`)) {
      return url;
    }
  }

  // Body type fallback
  const bodyKey = (bodyType || '').toLowerCase().trim();
  if (SEGMENT_FALLBACKS[bodyKey]) return SEGMENT_FALLBACKS[bodyKey];

  return SEGMENT_FALLBACKS.default;
}
