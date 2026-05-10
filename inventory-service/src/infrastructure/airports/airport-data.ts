export interface AirportRecord {
  iata: string;
  name: string;
  city: string;
  country: string;
}

/**
 * Static reference dataset of major world airports.
 * Airport IATA codes are stable reference data — no live API call required.
 */
export const AIRPORTS: AirportRecord[] = [
  { iata: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'GB' },
  { iata: 'LGW', name: 'Gatwick Airport', city: 'London', country: 'GB' },
  { iata: 'STN', name: 'Stansted Airport', city: 'London', country: 'GB' },
  { iata: 'LCY', name: 'City Airport', city: 'London', country: 'GB' },
  { iata: 'JFK', name: 'John F. Kennedy Intl', city: 'New York', country: 'US' },
  { iata: 'LGA', name: 'LaGuardia Airport', city: 'New York', country: 'US' },
  { iata: 'EWR', name: 'Newark Liberty Intl', city: 'New York', country: 'US' },
  { iata: 'LAX', name: 'Los Angeles Intl', city: 'Los Angeles', country: 'US' },
  { iata: 'ORD', name: "O'Hare Intl", city: 'Chicago', country: 'US' },
  { iata: 'MDW', name: 'Midway Airport', city: 'Chicago', country: 'US' },
  { iata: 'ATL', name: 'Hartsfield-Jackson Atlanta Intl', city: 'Atlanta', country: 'US' },
  { iata: 'DFW', name: 'Dallas/Fort Worth Intl', city: 'Dallas', country: 'US' },
  { iata: 'DEN', name: 'Denver Intl', city: 'Denver', country: 'US' },
  { iata: 'SFO', name: 'San Francisco Intl', city: 'San Francisco', country: 'US' },
  { iata: 'SEA', name: 'Seattle-Tacoma Intl', city: 'Seattle', country: 'US' },
  { iata: 'MIA', name: 'Miami Intl', city: 'Miami', country: 'US' },
  { iata: 'BOS', name: 'Logan Intl', city: 'Boston', country: 'US' },
  { iata: 'IAD', name: 'Dulles Intl', city: 'Washington', country: 'US' },
  { iata: 'DCA', name: 'Reagan National', city: 'Washington', country: 'US' },
  { iata: 'LAS', name: 'Harry Reid Intl', city: 'Las Vegas', country: 'US' },
  { iata: 'PHX', name: 'Phoenix Sky Harbor Intl', city: 'Phoenix', country: 'US' },
  { iata: 'HOU', name: 'William P. Hobby Airport', city: 'Houston', country: 'US' },
  { iata: 'IAH', name: 'George Bush Intercontinental', city: 'Houston', country: 'US' },
  { iata: 'MSP', name: 'Minneapolis-Saint Paul Intl', city: 'Minneapolis', country: 'US' },
  { iata: 'DTW', name: 'Detroit Metropolitan Wayne County', city: 'Detroit', country: 'US' },
  { iata: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'FR' },
  { iata: 'ORY', name: 'Orly Airport', city: 'Paris', country: 'FR' },
  { iata: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'DE' },
  { iata: 'MUC', name: 'Munich Airport', city: 'Munich', country: 'DE' },
  { iata: 'BER', name: 'Berlin Brandenburg Airport', city: 'Berlin', country: 'DE' },
  { iata: 'AMS', name: 'Amsterdam Schiphol', city: 'Amsterdam', country: 'NL' },
  { iata: 'MAD', name: 'Adolfo Suárez Madrid-Barajas', city: 'Madrid', country: 'ES' },
  { iata: 'BCN', name: 'El Prat Airport', city: 'Barcelona', country: 'ES' },
  { iata: 'FCO', name: 'Leonardo da Vinci Intl', city: 'Rome', country: 'IT' },
  { iata: 'MXP', name: 'Milan Malpensa', city: 'Milan', country: 'IT' },
  { iata: 'LIN', name: 'Milan Linate', city: 'Milan', country: 'IT' },
  { iata: 'ZRH', name: 'Zurich Airport', city: 'Zurich', country: 'CH' },
  { iata: 'GVA', name: 'Geneva Airport', city: 'Geneva', country: 'CH' },
  { iata: 'VIE', name: 'Vienna Intl Airport', city: 'Vienna', country: 'AT' },
  { iata: 'BRU', name: 'Brussels Airport', city: 'Brussels', country: 'BE' },
  { iata: 'CPH', name: 'Copenhagen Airport', city: 'Copenhagen', country: 'DK' },
  { iata: 'ARN', name: 'Stockholm Arlanda', city: 'Stockholm', country: 'SE' },
  { iata: 'OSL', name: 'Oslo Gardermoen', city: 'Oslo', country: 'NO' },
  { iata: 'HEL', name: 'Helsinki-Vantaa', city: 'Helsinki', country: 'FI' },
  { iata: 'DUB', name: 'Dublin Airport', city: 'Dublin', country: 'IE' },
  { iata: 'LIS', name: 'Humberto Delgado Airport', city: 'Lisbon', country: 'PT' },
  { iata: 'ATH', name: 'Athens Intl', city: 'Athens', country: 'GR' },
  { iata: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'TR' },
  { iata: 'SAW', name: 'Istanbul Sabiha Gökçen', city: 'Istanbul', country: 'TR' },
  { iata: 'WAW', name: 'Warsaw Chopin Airport', city: 'Warsaw', country: 'PL' },
  { iata: 'PRG', name: 'Václav Havel Airport', city: 'Prague', country: 'CZ' },
  { iata: 'BUD', name: 'Budapest Ferenc Liszt Intl', city: 'Budapest', country: 'HU' },
  { iata: 'SVO', name: 'Sheremetyevo Intl', city: 'Moscow', country: 'RU' },
  { iata: 'DME', name: 'Domodedovo Intl', city: 'Moscow', country: 'RU' },
  { iata: 'LED', name: 'Pulkovo Airport', city: 'Saint Petersburg', country: 'RU' },
  { iata: 'DXB', name: 'Dubai Intl', city: 'Dubai', country: 'AE' },
  { iata: 'AUH', name: 'Abu Dhabi Intl', city: 'Abu Dhabi', country: 'AE' },
  { iata: 'DOH', name: 'Hamad Intl', city: 'Doha', country: 'QA' },
  { iata: 'KWI', name: 'Kuwait Intl', city: 'Kuwait City', country: 'KW' },
  { iata: 'RUH', name: 'King Khalid Intl', city: 'Riyadh', country: 'SA' },
  { iata: 'JED', name: 'King Abdulaziz Intl', city: 'Jeddah', country: 'SA' },
  { iata: 'CAI', name: 'Cairo Intl', city: 'Cairo', country: 'EG' },
  { iata: 'JNB', name: 'O.R. Tambo Intl', city: 'Johannesburg', country: 'ZA' },
  { iata: 'CPT', name: 'Cape Town Intl', city: 'Cape Town', country: 'ZA' },
  { iata: 'NBO', name: 'Jomo Kenyatta Intl', city: 'Nairobi', country: 'KE' },
  { iata: 'LOS', name: 'Murtala Muhammed Intl', city: 'Lagos', country: 'NG' },
  { iata: 'ADD', name: 'Bole Intl Airport', city: 'Addis Ababa', country: 'ET' },
  { iata: 'BOM', name: 'Chhatrapati Shivaji Maharaj Intl', city: 'Mumbai', country: 'IN' },
  { iata: 'DEL', name: 'Indira Gandhi Intl', city: 'Delhi', country: 'IN' },
  { iata: 'BLR', name: 'Kempegowda Intl', city: 'Bengaluru', country: 'IN' },
  { iata: 'MAA', name: 'Chennai Intl', city: 'Chennai', country: 'IN' },
  { iata: 'HYD', name: 'Rajiv Gandhi Intl', city: 'Hyderabad', country: 'IN' },
  { iata: 'CCU', name: 'Netaji Subhash Chandra Bose Intl', city: 'Kolkata', country: 'IN' },
  { iata: 'PEK', name: 'Beijing Capital Intl', city: 'Beijing', country: 'CN' },
  { iata: 'PKX', name: 'Beijing Daxing Intl', city: 'Beijing', country: 'CN' },
  { iata: 'PVG', name: 'Shanghai Pudong Intl', city: 'Shanghai', country: 'CN' },
  { iata: 'SHA', name: 'Shanghai Hongqiao Intl', city: 'Shanghai', country: 'CN' },
  { iata: 'CAN', name: 'Guangzhou Baiyun Intl', city: 'Guangzhou', country: 'CN' },
  { iata: 'HKG', name: 'Hong Kong Intl', city: 'Hong Kong', country: 'HK' },
  { iata: 'TPE', name: 'Taiwan Taoyuan Intl', city: 'Taipei', country: 'TW' },
  { iata: 'ICN', name: 'Incheon Intl', city: 'Seoul', country: 'KR' },
  { iata: 'GMP', name: 'Gimpo Intl', city: 'Seoul', country: 'KR' },
  { iata: 'NRT', name: 'Narita Intl', city: 'Tokyo', country: 'JP' },
  { iata: 'HND', name: 'Tokyo Haneda', city: 'Tokyo', country: 'JP' },
  { iata: 'KIX', name: 'Osaka Kansai Intl', city: 'Osaka', country: 'JP' },
  { iata: 'SIN', name: 'Singapore Changi', city: 'Singapore', country: 'SG' },
  { iata: 'KUL', name: 'Kuala Lumpur Intl', city: 'Kuala Lumpur', country: 'MY' },
  { iata: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'TH' },
  { iata: 'DMK', name: 'Don Mueang Intl', city: 'Bangkok', country: 'TH' },
  { iata: 'CGK', name: 'Soekarno-Hatta Intl', city: 'Jakarta', country: 'ID' },
  { iata: 'MNL', name: 'Ninoy Aquino Intl', city: 'Manila', country: 'PH' },
  { iata: 'SGN', name: 'Tan Son Nhat Intl', city: 'Ho Chi Minh City', country: 'VN' },
  { iata: 'HAN', name: 'Noi Bai Intl', city: 'Hanoi', country: 'VN' },
  { iata: 'SYD', name: 'Kingsford Smith Airport', city: 'Sydney', country: 'AU' },
  { iata: 'MEL', name: 'Melbourne Airport', city: 'Melbourne', country: 'AU' },
  { iata: 'BNE', name: 'Brisbane Airport', city: 'Brisbane', country: 'AU' },
  { iata: 'PER', name: 'Perth Airport', city: 'Perth', country: 'AU' },
  { iata: 'AKL', name: 'Auckland Airport', city: 'Auckland', country: 'NZ' },
  { iata: 'YYZ', name: 'Toronto Pearson Intl', city: 'Toronto', country: 'CA' },
  { iata: 'YVR', name: 'Vancouver Intl', city: 'Vancouver', country: 'CA' },
  { iata: 'YUL', name: 'Montréal-Trudeau Intl', city: 'Montreal', country: 'CA' },
  { iata: 'YYC', name: 'Calgary Intl', city: 'Calgary', country: 'CA' },
  { iata: 'MEX', name: 'Benito Juárez Intl', city: 'Mexico City', country: 'MX' },
  { iata: 'GRU', name: 'São Paulo/Guarulhos Intl', city: 'São Paulo', country: 'BR' },
  { iata: 'CGH', name: 'São Paulo/Congonhas', city: 'São Paulo', country: 'BR' },
  { iata: 'GIG', name: 'Rio de Janeiro/Galeão Intl', city: 'Rio de Janeiro', country: 'BR' },
  { iata: 'EZE', name: 'Ministro Pistarini Intl', city: 'Buenos Aires', country: 'AR' },
  { iata: 'SCL', name: 'Arturo Merino Benítez Intl', city: 'Santiago', country: 'CL' },
  { iata: 'BOG', name: 'El Dorado Intl', city: 'Bogotá', country: 'CO' },
  { iata: 'LIM', name: 'Jorge Chávez Intl', city: 'Lima', country: 'PE' },
  { iata: 'TLV', name: 'Ben Gurion Intl', city: 'Tel Aviv', country: 'IL' },
  { iata: 'AMM', name: 'Queen Alia Intl', city: 'Amman', country: 'JO' },
  { iata: 'BEY', name: 'Rafic Hariri Intl', city: 'Beirut', country: 'LB' },
  { iata: 'MCT', name: 'Muscat Intl', city: 'Muscat', country: 'OM' },
  { iata: 'BAH', name: 'Bahrain Intl', city: 'Manama', country: 'BH' },
  { iata: 'KHI', name: 'Jinnah Intl', city: 'Karachi', country: 'PK' },
  { iata: 'LHE', name: 'Allama Iqbal Intl', city: 'Lahore', country: 'PK' },
  { iata: 'ISB', name: 'Islamabad Intl', city: 'Islamabad', country: 'PK' },
  { iata: 'CMB', name: 'Bandaranaike Intl', city: 'Colombo', country: 'LK' },
  { iata: 'DAC', name: 'Hazrat Shahjalal Intl', city: 'Dhaka', country: 'BD' },
  { iata: 'KTM', name: 'Tribhuvan Intl', city: 'Kathmandu', country: 'NP' },
  { iata: 'MLE', name: 'Velana Intl', city: 'Malé', country: 'MV' },
];

const lc = (s: string) => s.toLowerCase();

export function searchAirports(query: string, limit = 10): AirportRecord[] {
  const q = lc(query.trim());
  if (q.length < 2) return [];

  const scored = AIRPORTS
    .map((a) => {
      const iataMatch = lc(a.iata).startsWith(q) ? 3 : 0;
      const cityMatch = lc(a.city).startsWith(q) ? 2 : lc(a.city).includes(q) ? 1 : 0;
      const nameMatch = lc(a.name).includes(q) ? 1 : 0;
      const score = iataMatch + cityMatch + nameMatch;
      return { airport: a, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ airport }) => airport);
}
