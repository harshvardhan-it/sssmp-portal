export interface DistrictBlockMap {
  district: string;
  districtHi: string;
  blocks: { en: string; hi: string }[];
}

export const MP_DISTRICTS: DistrictBlockMap[] = [
  {
    district: 'Bhopal',
    districtHi: 'भोपाल',
    blocks: [
      { en: 'Berasia', hi: 'बैरसिया' },
      { en: 'Phanda Urban', hi: 'फंदा शहरी' },
      { en: 'Phanda Rural', hi: 'फंदा ग्रामीण' },
    ],
  },
  {
    district: 'Indore',
    districtHi: 'इन्दौर',
    blocks: [
      { en: 'Depalpur', hi: 'देपालपुर' },
      { en: 'Indore City', hi: 'इन्दौर नगर' },
      { en: 'Mhow (Dr. Ambedkar Nagar)', hi: 'महू (डॉ. अम्बेडकर नगर)' },
      { en: 'Sanwer', hi: 'सांवेर' },
    ],
  },
  {
    district: 'Jabalpur',
    districtHi: 'जबलपुर',
    blocks: [
      { en: 'Jabalpur City', hi: 'जबलपुर नगर' },
      { en: 'Kundam', hi: 'कुण्डम' },
      { en: 'Majholi', hi: 'मझौली' },
      { en: 'Panagar', hi: 'पनागर' },
      { en: 'Patan', hi: 'पाटन' },
      { en: 'Shahpura', hi: 'शाहपुरा' },
      { en: 'Sihora', hi: 'सिहोरा' },
    ],
  },
  {
    district: 'Gwalior',
    districtHi: 'ग्वालियर',
    blocks: [
      { en: 'Gwalior Urban', hi: 'ग्वालियर नगर' },
      { en: 'Ghatigaon (Barai)', hi: 'घाटीगांव (बरई)' },
      { en: 'Morar Rural', hi: 'मुरार ग्रामीण' },
      { en: 'Dabra', hi: 'डबरा' },
      { en: 'Bhitarwar', hi: 'भितरवार' },
    ],
  },
  {
    district: 'Ujjain',
    districtHi: 'उज्जैन',
    blocks: [
      { en: 'Badnagar', hi: 'बड़नगर' },
      { en: 'Ghatiya', hi: 'घट्टिया' },
      { en: 'Khachrod', hi: 'खाचरौद' },
      { en: 'Mahidpur', hi: 'महिदपुर' },
      { en: 'Nagda', hi: 'नागदा' },
      { en: 'Tarana', hi: 'तराना' },
      { en: 'Ujjain City', hi: 'उज्जैन नगर' },
    ],
  },
  {
    district: 'Sagar',
    districtHi: 'सागर',
    blocks: [
      { en: 'Banda', hi: 'बंडा' },
      { en: 'Bina', hi: 'बीना' },
      { en: 'Deori', hi: 'देवरी' },
      { en: 'Jaisinagar', hi: 'जैसीनगर' },
      { en: 'Khurai', hi: 'खुरई' },
      { en: 'Malthone', hi: 'मालथौन' },
      { en: 'Rahatgarh', hi: 'राहतगढ़' },
      { en: 'Rehli', hi: 'रेहली' },
      { en: 'Sagar', hi: 'सागर' },
      { en: 'Shahgarh', hi: 'शाहगढ़' },
    ],
  },
  {
    district: 'Rewa',
    districtHi: 'रीवा',
    blocks: [
      { en: 'Gangeo', hi: 'गंगेव' },
      { en: 'Hanumana', hi: 'हनुमना' },
      { en: 'Huzur', hi: 'हुजूर' },
      { en: 'Jawa', hi: 'जवा' },
      { en: 'Mauganj', hi: 'मऊगंज' },
      { en: 'Naigarhi', hi: 'नईगढ़ी' },
      { en: 'Raipur Karchuliyan', hi: 'रायपुर कर्चुलियान' },
      { en: 'Semariya', hi: 'सेमरिया' },
      { en: 'Sirmaur', hi: 'सिरमौर' },
      { en: 'Teonthar', hi: 'त्योंथर' },
    ],
  },
  {
    district: 'Satna',
    districtHi: 'सतना',
    blocks: [
      { en: 'Amarpatan', hi: 'अमरपाटन' },
      { en: 'Maihar', hi: 'मैहर' },
      { en: 'Nagod', hi: 'नागोद' },
      { en: 'Raghurajnagar', hi: 'रघुराजनगर' },
      { en: 'Ramnagar', hi: 'रामनगर' },
      { en: 'Rampur Baghelan', hi: 'रामपुर बघेलान' },
      { en: 'Uchehara', hi: 'उचेहरा' },
    ],
  },
  {
    district: 'Chhindwara',
    districtHi: 'छिंदवाड़ा',
    blocks: [
      { en: 'Amarwara', hi: 'अमरवाड़ा' },
      { en: 'Chaurai', hi: 'चौरई' },
      { en: 'Chhindwara', hi: 'छिंदवाड़ा' },
      { en: 'Harrai', hi: 'हर्रई' },
      { en: 'Jamai (Junnardeo)', hi: 'जुन्नारदेव' },
      { en: 'Mohkhed', hi: 'मोहखेड़' },
      { en: 'Pandhurna', hi: 'पांढुरना' },
      { en: 'Parasia', hi: 'परासिया' },
      { en: 'Sausar', hi: 'सौंसर' },
      { en: 'Tamia', hi: 'तामिया' },
    ],
  },
  {
    district: 'Sehore',
    districtHi: 'सीहोर',
    blocks: [
      { en: 'Ashta', hi: 'आष्टा' },
      { en: 'Budhni', hi: 'बुधनी' },
      { en: 'Ichhawar', hi: 'इछावर' },
      { en: 'Nasrullaganj (Bhairunda)', hi: 'भैरूंदा' },
      { en: 'Sehore', hi: 'सीहोर' },
    ],
  },
  {
    district: 'Dhar',
    districtHi: 'धार',
    blocks: [
      { en: 'Badnawar', hi: 'बदनावर' },
      { en: 'Dhar', hi: 'धार' },
      { en: 'Dharampuri', hi: 'धरमपुरी' },
      { en: 'Gandhwani', hi: 'गंधवानी' },
      { en: 'Kukshi', hi: 'कुक्षी' },
      { en: 'Manawar', hi: 'मनावर' },
      { en: 'Nalchha', hi: 'नलछा' },
      { en: 'Sardarpur', hi: 'सरदारपुर' },
      { en: 'Tirla', hi: 'तिरला' },
    ],
  },
  {
    district: 'Hoshangabad (Narmadapuram)',
    districtHi: 'नर्मदापुरम',
    blocks: [
      { en: 'Babai (Makhan Nagar)', hi: 'माखन नगर' },
      { en: 'Bankhedi', hi: 'बनखेड़ी' },
      { en: 'Hoshangabad', hi: 'नर्मदापुरम' },
      { en: 'Itarsi', hi: 'इटारसी' },
      { en: 'Pipariya', hi: 'पिपरिया' },
      { en: 'Seoni Malwa', hi: 'सिवनी मालवा' },
      { en: 'Sohagpur', hi: 'सोहागपुर' },
    ],
  },
];

export const DESIGNATIONS = [
  { en: 'Prathmik Shikshak (Primary Teacher)', hi: 'प्राथमिक शिक्षक' },
  { en: 'Madhyamik Shikshak (Middle School Teacher)', hi: 'माध्यमिक शिक्षक' },
  { en: 'Uchchatam Madhyamik Shikshak (Lecturer / UMS)', hi: 'उच्च माध्यमिक शिक्षक' },
  { en: 'Pradhanadhyapak (Headmaster - Primary)', hi: 'प्रधान पाठक (प्राथमिक शाला)' },
  { en: 'Pradhanadhyapak (Headmaster - Middle)', hi: 'प्रधान पाठक (माध्यमिक शाला)' },
  { en: 'Varishtha Adhyapak / Vy व्याख्याता', hi: 'वरिष्ठ अध्यापक / व्याख्याता' },
  { en: 'Prayogshala Shikshak (Lab Teacher)', hi: 'प्रयोगशाला शिक्षक' },
  { en: 'Sangeet / Vyayam Shikshak (PT / Music Teacher)', hi: 'व्यायाम / संगीत शिक्षक' },
  { en: 'Atithi Vidwan / Shikshakarmi', hi: 'विभागीय शिक्षक संवर्ग' },
];
